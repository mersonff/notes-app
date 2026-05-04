Rails.application.routes.draw do
  # Liveness/readiness — used by docker-compose healthchecks and load balancers.
  get "up" => "rails/health#show", as: :rails_health_check

  namespace :api do
    namespace :v1 do
      resources :notes, only: %i[index create]
    end
  end
end
