# syntax=docker/dockerfile:1
FROM docker.io/library/ruby:3.4.9-slim

WORKDIR /rails

RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential git libpq-dev libyaml-dev pkg-config postgresql-client && \
    rm -rf /var/lib/apt/lists /var/cache/apt/archives

ENV BUNDLE_PATH=/usr/local/bundle

EXPOSE 3000

CMD ["bash", "-lc", "bundle check >/dev/null 2>&1 || bundle install && bin/rails db:prepare && bin/rails s -b 0.0.0.0 -p 3000"]
