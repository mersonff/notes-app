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

  private

  # Strip surrounding whitespace before validation runs. Rails' `blank?`
  # already treats "   " as blank, so a whitespace-only title still fails
  # the presence check — but normalizing here also prevents persisting
  # "  Hello  " with cosmetic padding.
  def normalize_title
    self.title = title.strip if title.is_a?(String)
  end
end
