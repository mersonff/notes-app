# Rack CORS configuration.
#
# Origins are sourced from the CORS_ORIGINS environment variable
# (comma-separated). This keeps the configuration 12-factor compliant —
# the same Docker image can serve any environment by varying the env.
#
# Example: CORS_ORIGINS=https://app.example.com,https://staging.example.com
#
# In development the default falls back to the typical Vite dev server.

Rails.application.config.middleware.insert_before 0, Rack::Cors do
  raw_origins = ENV.fetch("CORS_ORIGINS", "http://localhost:5173")
  configured_origins = raw_origins.split(",").map(&:strip).reject(&:empty?)

  allow do
    origins(*configured_origins)

    resource "/api/*",
      headers: :any,
      methods: %i[get post put patch delete options head],
      expose: %w[link current-page page-limit total-pages total-count],
      max_age: 600
  end
end
