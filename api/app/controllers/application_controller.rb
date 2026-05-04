class ApplicationController < ActionController::API
  include Pagy::Backend

  before_action :switch_locale

  private

  # Picks the request locale from the Accept-Language header when it matches
  # one of the locales we ship; otherwise falls back to I18n.default_locale.
  # Only the first language tag is honoured (q-values are intentionally
  # ignored — keeping this small and predictable).
  def switch_locale
    requested = request.headers["Accept-Language"].to_s.scan(/[a-zA-Z\-]+/).first
    I18n.locale = supported_locale?(requested) ? requested : I18n.default_locale
  end

  def supported_locale?(tag)
    return false if tag.blank?

    I18n.available_locales.map(&:to_s).include?(tag)
  end
end
