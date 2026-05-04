require "rails_helper"

RSpec.describe "Api::V1::Notes", type: :request do
  describe "GET /api/v1/notes" do
    context "without any notes" do
      it "returns 200 with an empty data array and pagination metadata" do
        get "/api/v1/notes"

        expect(response).to have_http_status(:ok)
        body = response.parsed_body
        expect(body["data"]).to eq([])
        expect(body["pagination"]).to include(
          "page" => 1,
          "limit" => 20,
          "count" => 0,
          "pages" => 1
        )
      end
    end

    context "with notes spanning multiple pages" do
      before do
        # Seed 25 notes; default page size is 20.
        25.times { create(:note) }
      end

      it "paginates to 20 items on the first page by default" do
        get "/api/v1/notes"

        body = response.parsed_body
        expect(body["data"].size).to eq(20)
        expect(body["pagination"]).to include(
          "page" => 1,
          "limit" => 20,
          "count" => 25,
          "pages" => 2,
          "next" => 2
        )
      end

      it "returns the remaining items on the second page" do
        get "/api/v1/notes", params: { page: 2 }

        body = response.parsed_body
        expect(body["data"].size).to eq(5)
        expect(body["pagination"]).to include("page" => 2, "next" => nil)
      end

      it "honours a client-supplied limit" do
        get "/api/v1/notes", params: { limit: 5 }

        body = response.parsed_body
        expect(body["data"].size).to eq(5)
        expect(body["pagination"]).to include("limit" => 5, "pages" => 5)
      end

      it "caps the client limit at PAGY_MAX_ITEMS to defend against ?limit=999999999" do
        get "/api/v1/notes", params: { limit: 9_999_999 }

        body = response.parsed_body
        expect(body["pagination"]["limit"]).to eq(Pagy::DEFAULT[:limit_max])
      end

      it "returns RFC-8288 Link and pagination headers" do
        get "/api/v1/notes", params: { page: 1, limit: 10 }

        expect(response.headers["link"]).to include('rel="next"')
        expect(response.headers["current-page"]).to eq("1")
        expect(response.headers["page-items"]).to eq("10")
        expect(response.headers["total-pages"]).to eq("3")
        expect(response.headers["total-count"]).to eq("25")
      end

      it "returns the most recently created note first" do
        newest = create(:note, title: "Mais recente", created_at: 1.minute.from_now)

        get "/api/v1/notes"

        expect(response.parsed_body["data"].first["id"]).to eq(newest.id)
      end

      it "returns an empty page for over-paginated requests (overflow=:empty_page)" do
        get "/api/v1/notes", params: { page: 999 }

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["data"]).to eq([])
      end
    end

    context "with invalid pagination parameters" do
      it "treats page=0 as page 1 (Pagy normalises page to >= 1)" do
        create(:note)
        get "/api/v1/notes", params: { page: 0 }

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["pagination"]["page"]).to eq(1)
      end

      it "treats a negative page as page 1" do
        create(:note)
        get "/api/v1/notes", params: { page: -3 }

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["pagination"]["page"]).to eq(1)
      end

      it "ignores a non-numeric limit and falls back to the default" do
        create(:note)
        get "/api/v1/notes", params: { limit: "abc" }

        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["pagination"]["limit"]).to eq(Pagy::DEFAULT[:limit])
      end
    end
  end

  describe "POST /api/v1/notes" do
    context "with valid attributes" do
      it "creates the note and returns 201 with the serialized payload" do
        expect {
          post "/api/v1/notes", params: { note: { title: "Reunião", content: "Pauta" } }
        }.to change(Note, :count).by(1)

        expect(response).to have_http_status(:created)
        body = response.parsed_body["data"]
        expect(body).to include("title" => "Reunião", "content" => "Pauta")
        expect(body["created_at"]).to be_present
      end

      it "creates a note with no content (content is optional)" do
        post "/api/v1/notes", params: { note: { title: "Só título" } }

        expect(response).to have_http_status(:created)
        expect(response.parsed_body["data"]["content"]).to be_nil
      end

      it "strips surrounding whitespace from the title" do
        post "/api/v1/notes", params: { note: { title: "  Título  " } }

        expect(response).to have_http_status(:created)
        expect(response.parsed_body["data"]["title"]).to eq("Título")
      end
    end

    context "with invalid attributes" do
      it "rejects a missing title with 422 and an error payload (pt-BR)" do
        post "/api/v1/notes",
             params: { note: { content: "sem título" } },
             headers: { "Accept-Language" => "pt-BR" }

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]).to include(
          "title" => [ "não pode ficar em branco" ]
        )
      end

      it "rejects an empty title" do
        post "/api/v1/notes", params: { note: { title: "", content: "x" } }

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]).to have_key("title")
      end

      it "rejects a whitespace-only title" do
        post "/api/v1/notes", params: { note: { title: "   ", content: "x" } }

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]).to have_key("title")
      end

      it "rejects a title over the maximum length" do
        post "/api/v1/notes",
             params: { note: { title: "T" * (Note::TITLE_MAX_LENGTH + 1) } }

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]).to have_key("title")
      end

      it "rejects content over the maximum length" do
        post "/api/v1/notes",
             params: { note: { title: "ok", content: "C" * (Note::CONTENT_MAX_LENGTH + 1) } }

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]).to have_key("content")
      end

      it "returns errors in English when Accept-Language: en" do
        post "/api/v1/notes",
             params: { note: { content: "no title" } },
             headers: { "Accept-Language" => "en" }

        expect(response).to have_http_status(:unprocessable_content)
        expect(response.parsed_body["errors"]["title"]).to include("can't be blank")
      end
    end

    context "with malformed input" do
      it "returns 400 when the JSON body is malformed" do
        post "/api/v1/notes",
             params: "{not valid json",
             headers: { "Content-Type" => "application/json" }

        expect(response).to have_http_status(:bad_request)
        expect(response.parsed_body["error"]).to be_present
      end

      it "returns 400 when the note key is missing entirely" do
        post "/api/v1/notes", params: { foo: "bar" }

        expect(response).to have_http_status(:bad_request)
      end

      it "ignores unknown attributes (strong-params drops them silently)" do
        post "/api/v1/notes",
             params: { note: { title: "x", content: "y", admin: true, id: 999 } }

        expect(response).to have_http_status(:created)
        # The unknown keys must not have been persisted as columns.
        expect(Note.last.id).not_to eq(999)
      end
    end
  end
end
