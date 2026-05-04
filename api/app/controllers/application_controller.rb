class ApplicationController < ActionController::API
  include Pagy::Backend

  before_action :switch_locale

  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActionController::ParameterMissing, with: :render_bad_request
  rescue_from ActionDispatch::Http::Parameters::ParseError, with: :render_malformed_json
  rescue_from Pagy::OverflowError, with: :render_invalid_pagination

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

  def render_not_found(_exception)
    render json: { error: I18n.t("api.errors.not_found") }, status: :not_found
  end

  def render_bad_request(exception)
    render json: { error: exception.message }, status: :bad_request
  end

  def render_malformed_json(_exception)
    render json: { error: I18n.t("api.errors.malformed_json") }, status: :bad_request
  end

  def render_invalid_pagination(_exception)
    render json: { error: I18n.t("api.errors.invalid_pagination") }, status: :bad_request
  end
end
