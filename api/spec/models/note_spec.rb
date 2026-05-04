require "rails_helper"

RSpec.describe Note, type: :model do
  describe "schema" do
    it { is_expected.to have_db_column(:title).of_type(:string).with_options(null: false, limit: 120) }
    it { is_expected.to have_db_column(:content).of_type(:text) }
    it { is_expected.to have_db_index(:created_at) }
  end

  describe "validations" do
    subject { build(:note) }

    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_length_of(:title).is_at_most(Note::TITLE_MAX_LENGTH) }
    it { is_expected.to validate_length_of(:content).is_at_most(Note::CONTENT_MAX_LENGTH) }

    context "title" do
      it "is valid with a non-empty title" do
        expect(build(:note, title: "Reunião")).to be_valid
      end

      it "is invalid when nil" do
        note = build(:note, title: nil)
        expect(note).to be_invalid
        expect(note.errors[:title]).to include(I18n.t("errors.messages.blank"))
      end

      it "is invalid when empty" do
        note = build(:note, title: "")
        expect(note).to be_invalid
        expect(note.errors[:title]).to be_present
      end

      it "is invalid when whitespace-only (caught by presence after stripping)" do
        note = build(:note, title: "   \t  ")
        expect(note).to be_invalid
        expect(note.errors[:title]).to include(I18n.t("errors.messages.blank"))
      end

      it "is valid at the maximum length boundary" do
        expect(build(:note, :with_max_title)).to be_valid
      end

      it "is invalid when exceeding the maximum length" do
        note = build(:note, title: "T" * (Note::TITLE_MAX_LENGTH + 1))
        expect(note).to be_invalid
        expect(note.errors[:title]).to be_present
      end

      it "strips surrounding whitespace before validation" do
        note = build(:note, title: "  Reunião com time  ")
        note.valid?
        expect(note.title).to eq("Reunião com time")
      end

      it "preserves internal whitespace" do
        note = build(:note, title: "  Reunião   com   time  ")
        note.valid?
        expect(note.title).to eq("Reunião   com   time")
      end
    end

    context "content" do
      it "is valid when nil (content is optional)" do
        expect(build(:note, :without_content)).to be_valid
      end

      it "is valid when empty string" do
        expect(build(:note, content: "")).to be_valid
      end

      it "is valid at the maximum length boundary" do
        expect(build(:note, :with_max_content)).to be_valid
      end

      it "is invalid when exceeding the maximum length" do
        note = build(:note, content: "C" * (Note::CONTENT_MAX_LENGTH + 1))
        expect(note).to be_invalid
        expect(note.errors[:content]).to be_present
      end
    end
  end

  describe ".recent_first" do
    it "orders by created_at descending, then id descending as a tiebreaker" do
      older  = create(:note, created_at: 2.hours.ago)
      newer  = create(:note, created_at: 1.hour.ago)
      newest = create(:note, created_at: 1.hour.ago)

      expect(described_class.recent_first.to_a).to eq([ newest, newer, older ])
    end
  end

  describe "i18n integration" do
    it "renders the title attribute name in pt-BR" do
      I18n.with_locale(:"pt-BR") do
        expect(Note.human_attribute_name(:title)).to eq("Título")
      end
    end

    it "renders the title attribute name in en" do
      I18n.with_locale(:en) do
        expect(Note.human_attribute_name(:title)).to eq("Title")
      end
    end
  end

  describe "persistence at the DB layer (defense in depth)" do
    it "rejects null titles even if validations are bypassed" do
      expect {
        described_class.new(title: nil, content: "x").save!(validate: false)
      }.to raise_error(ActiveRecord::NotNullViolation)
    end

    it "rejects titles over 120 characters at the DB layer" do
      expect {
        described_class.new(title: "T" * 121, content: nil).save!(validate: false)
      }.to raise_error(ActiveRecord::ValueTooLong)
    end
  end
end
