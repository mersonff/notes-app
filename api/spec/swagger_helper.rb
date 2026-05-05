# frozen_string_literal: true

require "rails_helper"

RSpec.configure do |config|
  config.openapi_root = Rails.root.join("swagger").to_s

  config.openapi_specs = {
    "v1/swagger.yaml" => {
      openapi: "3.0.1",
      info: {
        title: "Notes API",
        description: "CRUD para anotações. Errors traduzidas via header `Accept-Language` (pt-BR padrão, en suportado).",
        version: "v1"
      },
      servers: [
        { url: "/", description: "Same-origin (recommended — works behind nginx in compose)" }
      ],
      components: {
        schemas: {
          Note: {
            type: :object,
            properties: {
              id:         { type: :integer, example: 1 },
              title:      { type: :string,  example: "Reunião" },
              content:    { type: :string,  nullable: true, example: "Pauta..." },
              created_at: { type: :string, format: "date-time" },
              updated_at: { type: :string, format: "date-time" }
            },
            required: %w[id title created_at updated_at]
          },
          NoteInput: {
            type: :object,
            properties: {
              note: {
                type: :object,
                properties: {
                  title:   { type: :string, example: "Reunião" },
                  content: { type: :string, nullable: true, example: "Pauta opcional" }
                },
                required: %w[title]
              }
            },
            required: %w[note]
          },
          Pagination: {
            type: :object,
            properties: {
              page:  { type: :integer, example: 1 },
              limit: { type: :integer, example: 20 },
              pages: { type: :integer, example: 1 },
              count: { type: :integer, example: 3 },
              prev:  { type: :integer, nullable: true, example: nil },
              next:  { type: :integer, nullable: true, example: nil }
            }
          },
          Errors: {
            type: :object,
            description: "Validation failures keyed by attribute name. Each value is a list of messages (localized via Accept-Language).",
            properties: {
              errors: {
                type: :object,
                additionalProperties: { type: :array, items: { type: :string } }
              }
            }
          },
          NotFound: {
            type: :object,
            properties: { error: { type: :string, example: "Recurso não encontrado." } }
          }
        }
      }
    }
  }

  config.openapi_format = :yaml
end
