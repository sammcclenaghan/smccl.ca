---
title: "Building a Course Scheduler on a Tiny VPS"
description: "What I learned deploying a Go and React course scheduler on one small DigitalOcean Droplet."
date: 2026-05-17
---

I have been building a course scheduling app called `course_flow`.

The app itself is the fun part: search for courses, add them to a schedule, and make planning a semester less painful.

But the deployment taught me more than I expected.

I wanted the app to run on a small DigitalOcean Droplet without paying for a managed database, separate frontend hosting, or extra infrastructure.

That constraint forced me to understand every moving piece.

## The Shape

The setup is deliberately small.

One VPS runs the Go API, the built React app, a MySQL database, and Caddy.

The Go API handles the backend. The React app is built ahead of time. Caddy sits in front, handles HTTPS, serves static assets, and proxies API requests.

The whole thing runs from Docker Compose:

```yaml
services:
  app:
    image: ${APP_IMAGE:-course-flow:local}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: mysql:8.4
    volumes:
      - mysql-data:/var/lib/mysql

  caddy:
    image: ${CADDY_IMAGE:-course-flow-caddy:local}
    ports:
      - "80:80"
      - "443:443"
```

This is not a fancy architecture.

That is the point.

For a student project, a single machine is enough. It is cheaper, easier to reason about, and much harder to hide behind.

## The Reverse Proxy

Caddy was one of the nicer parts of the setup.

I wanted one origin for the frontend and backend, so the browser could talk to `/api` without dealing with cross-origin problems in production.

The Caddyfile ended up being small:

```text
{$DOMAIN} {
  encode gzip zstd

  @assets path /assets/* /vite.svg
  handle @assets {
    root * /srv/frontend
    header Cache-Control "public, max-age=31536000, immutable"
    file_server
  }

  handle {
    reverse_proxy app:8080
  }
}
```

Static assets get cached aggressively. Everything else goes to the Go app.

That taught me a useful deployment lesson: the reverse proxy is not just plumbing. It defines the public shape of the app.

## Deploying

I also wanted deploys to be boring.

GitHub Actions builds the app image and the Caddy image, pushes both to GitHub Container Registry, then SSHes into the Droplet.

The Droplet pulls the new images and restarts the services.

That keeps heavy Docker builds off the tiny VPS.

The server should run the app, not spend all its memory compiling it.

## Scheduled Imports

Course data is not static forever.

The app has a separate importer binary for refreshing course and enrollment data. That runs outside the web request path.

On the server, cron can call it on a schedule:

```text
0 3 * * * cd /opt/course-flow && APP_ROOT=/opt/course-flow ./scripts/run-import.sh refresh-enrollment -term ${COURSE_FLOW_TERM}
```

I like this separation.

The API serves users. The importer updates data. The backup script protects the database.

They are part of the same system, but they do not all need to be the same process.

## What I Learned

Before this, deployment felt like a vague final step after building the app.

This project made it feel like part of the design.

Where does the database live? Who owns TLS? How do secrets get onto the machine? What happens when the server restarts? Where do logs go?

A tiny VPS makes those questions visible.

That is what I liked about it.

It was not the most scalable version of the app, but it was understandable. I could point at every piece and explain why it was there.

For where this project is right now, that feels like the right tradeoff.
