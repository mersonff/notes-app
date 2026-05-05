module Api
  module V1
    class NotesController < ApplicationController
      # Pagy::Backend computes @pagy on #index; emit RFC-8288 pagination
      # headers automatically so HTTP-savvy clients can navigate without
      # parsing the JSON body.
      after_action :emit_pagination_headers, only: :index

      before_action :load_note, only: %i[show update destroy]

      def index
        scope = Note.search(params[:search]).recent_first
        @pagy, notes = pagy(scope, page: safe_page, limit: safe_limit)

        render json: {
          data: notes.map { |note| serialize(note) },
          pagination: pagy_metadata(@pagy)
        }
      end

      def show
        render json: { data: serialize(@note) }
      end

      def create
        note = Note.new(note_params)

        if note.save
          render json: { data: serialize(note) }, status: :created
        else
          render json: { errors: note.errors.as_json(full_messages: false) },
                 status: :unprocessable_content
        end
      end

      def update
        if @note.update(note_params)
          render json: { data: serialize(@note) }
        else
          render json: { errors: @note.errors.as_json(full_messages: false) },
                 status: :unprocessable_content
        end
      end

      def destroy
        @note.destroy!
        head :no_content
      end

      private

      # Loads the requested note or surfaces a 404 via the global
      # ActiveRecord::RecordNotFound rescue in ApplicationController.
      def load_note
        @note = Note.find(params[:id])
      end

      def note_params
        params.expect(note: [ :title, :content ])
      end

      def serialize(note)
        {
          id: note.id,
          title: note.title,
          content: note.content,
          created_at: note.created_at&.iso8601,
          updated_at: note.updated_at&.iso8601
        }
      end

      # Normalise pagination params here instead of letting Pagy raise
      # a VariableError. The product decision is "garbage in → page 1
      # / default limit", which is gentler for casual API consumers
      # than a hard 400.
      def safe_page
        page = params[:page].to_i
        page < 1 ? 1 : page
      end

      def safe_limit
        return Pagy::DEFAULT[:limit] unless params[:limit].present?

        requested = params[:limit].to_i
        return Pagy::DEFAULT[:limit] if requested < 1

        [ requested, Pagy::DEFAULT[:limit_max] ].min
      end

      def emit_pagination_headers
        return unless @pagy

        pagy_headers_merge(@pagy)
      end
    end
  end
end
