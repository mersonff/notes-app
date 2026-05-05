# frozen_string_literal: true

require "swagger_helper"

RSpec.describe "Notes API", type: :request do
  path "/api/v1/notes" do
    get "List notes (paginated)" do
      tags "Notes"
      produces "application/json"
      parameter name: :page,   in: :query, schema: { type: :integer, minimum: 1 }, required: false
      parameter name: :limit,  in: :query, schema: { type: :integer, minimum: 1 }, required: false
      parameter name: :search, in: :query, schema: { type: :string },              required: false

      response "200", "ok" do
        schema type: :object,
               properties: {
                 data: { type: :array, items: { "$ref" => "#/components/schemas/Note" } },
                 pagination: { "$ref" => "#/components/schemas/Pagination" }
               },
               required: %w[data pagination]

        before { create_list(:note, 3) }
        run_test!
      end
    end

    post "Create a note" do
      tags "Notes"
      consumes "application/json"
      produces "application/json"
      parameter name: :body, in: :body, schema: { "$ref" => "#/components/schemas/NoteInput" }

      response "201", "created" do
        let(:body) { { note: { title: "Reunião", content: "Pauta opcional" } } }
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Note" } }
        run_test!
      end

      response "422", "validation failed" do
        let(:body) { { note: { title: "" } } }
        schema "$ref" => "#/components/schemas/Errors"
        examples "application/json" => { errors: { title: [ "não pode ficar em branco" ] } }
        run_test!
      end
    end
  end

  path "/api/v1/notes/{id}" do
    parameter name: :id, in: :path, schema: { type: :integer }, required: true

    get "Show a note" do
      tags "Notes"
      produces "application/json"

      response "200", "ok" do
        let(:id) { create(:note).id }
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Note" } }
        run_test!
      end

      response "404", "not found" do
        let(:id) { 0 }
        schema "$ref" => "#/components/schemas/NotFound"
        run_test!
      end
    end

    patch "Update a note" do
      tags "Notes"
      consumes "application/json"
      produces "application/json"
      parameter name: :body, in: :body, schema: { "$ref" => "#/components/schemas/NoteInput" }

      response "200", "ok" do
        let(:id) { create(:note).id }
        let(:body) { { note: { title: "Novo título" } } }
        schema type: :object, properties: { data: { "$ref" => "#/components/schemas/Note" } }
        run_test!
      end

      response "422", "validation failed" do
        let(:id) { create(:note).id }
        let(:body) { { note: { title: "" } } }
        schema "$ref" => "#/components/schemas/Errors"
        run_test!
      end
    end

    delete "Destroy a note" do
      tags "Notes"

      response "204", "deleted" do
        let(:id) { create(:note).id }
        run_test!
      end

      response "404", "not found" do
        let(:id) { 0 }
        run_test!
      end
    end
  end
end
