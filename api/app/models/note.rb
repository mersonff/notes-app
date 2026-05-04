class Note < ApplicationRecord
  TITLE_MAX_LENGTH   = 120
  CONTENT_MAX_LENGTH = 5_000

  before_validation :normalize_title

  validates :title,
    presence: true,
    length: { maximum: TITLE_MAX_LENGTH }

  validates :content,
    length: { maximum: CONTENT_MAX_LENGTH },
    allow_blank: true

  scope :recent_first, -> { order(created_at: :desc, id: :desc) }

  # Case-insensitive substring match on title OR content. Returns the
  # full relation untouched when the query is blank so the caller can
  # always chain it without checking. Wildcards in the input are
  # escaped (sanitize_sql_like) so users can search for literal
  # `%` and `_` without those acting as LIKE wildcards.
  #
  # Note: accent-sensitive (PostgreSQL ILIKE on the raw column).
  # The `unaccent` extension would be the upgrade path if accent-
  # insensitive matching becomes necessary.
  scope :search, ->(query) {
    next all if query.blank?

    pattern = "%#{sanitize_sql_like(query.to_s.strip)}%"
    where("title ILIKE :p OR content ILIKE :p", p: pattern)
  }

  private

  # Strip surrounding whitespace before validation runs. Rails' `blank?`
  # already treats "   " as blank, so a whitespace-only title still fails
  # the presence check — but normalizing here also prevents persisting
  # "  Hello  " with cosmetic padding.
  def normalize_title
    self.title = title.strip if title.is_a?(String)
  end
end
