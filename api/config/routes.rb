Rails.application.routes.draw do
  # Liveness/readiness — used by docker-compose healthchecks and load balancers.
  get "up" => "rails/health#show", as: :rails_health_check

  mount Rswag::Api::Engine => "/api-docs"
  mount Rswag::Ui::Engine  => "/api-docs"

  namespace :api do
    namespace :v1 do
      resources :notes, only: %i[index show create update destroy]
    end
  end
end
