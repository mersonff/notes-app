# Pagy initializer.
#
# 12-factor: defaults are sourced from environment variables so the same
# image can be tuned per-environment (e.g. higher PAGY_MAX_ITEMS in staging).
#
# Extras enabled:
#   - headers:  exposes Link/current-page/page-limit/total-pages/total-count
#               response headers (RFC-8288), useful for any HTTP client.
#   - limit:    lets the client request a custom page size via ?limit= up to
#               :client_max_limit (defends against ?limit=999999999).
#   - overflow: when the requested page is past the last page, returns an
#               empty result set instead of raising — friendlier for SPAs.
#   - metadata: provides a #pagy_metadata helper used to embed pagination
#               info inside the JSON body (front-ends prefer body over
#               having to read CORS-exposed headers).

require "pagy/extras/headers"
require "pagy/extras/limit"
require "pagy/extras/overflow"
require "pagy/extras/metadata"

Pagy::DEFAULT[:limit]            = ENV.fetch("PAGY_DEFAULT_ITEMS", 20).to_i
Pagy::DEFAULT[:client_max_limit] = ENV.fetch("PAGY_MAX_ITEMS", 100).to_i
Pagy::DEFAULT[:overflow]         = :empty_page
Pagy::DEFAULT[:metadata]         = %i[page limit pages count prev next]

Pagy::DEFAULT.freeze
