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

  describe ".search" do
    let!(:meeting) { create(:note, title: "Reunião de produto", content: "Pauta: roadmap") }
    let!(:grocery) { create(:note, title: "Compras", content: "Banana, café, pão") }
    let!(:book)    { create(:note, title: "Livro: Refactoring", content: nil) }

    it "matches a substring of the title (case-insensitive)" do
      # Accent-sensitive — documented as a known limitation
      expect(described_class.search("reuniao")).to be_empty
      expect(described_class.search("reunião")).to contain_exactly(meeting)
      expect(described_class.search("REUNIÃO")).to contain_exactly(meeting)
      expect(described_class.search("uniã")).to contain_exactly(meeting)
    end

    it "matches a substring of the content" do
      expect(described_class.search("café")).to contain_exactly(grocery)
      expect(described_class.search("roadmap")).to contain_exactly(meeting)
    end

    it "matches across both title and content (returns either)" do
      expect(described_class.search("pauta")).to contain_exactly(meeting)
      expect(described_class.search("compras")).to contain_exactly(grocery)
    end

    it "returns multiple notes when many match" do
      common = create(:note, title: "Outro item de produto", content: nil)
      expect(described_class.search("produto")).to contain_exactly(meeting, common)
    end

    it "returns the full relation when the query is blank, nil or whitespace-only" do
      [ nil, "", "   ", "\t\n" ].each do |q|
        expect(described_class.search(q).count).to eq(described_class.count)
      end
    end

    it "treats the query as a literal — wildcards in the input are escaped" do
      # Without escaping, `%` would match everything; sanitised, it's literal.
      pct = create(:note, title: "Title with literal % char")
      und = create(:note, title: "Title with literal _ char")

      expect(described_class.search("%")).to contain_exactly(pct)
      expect(described_class.search("_")).to contain_exactly(und)
    end

    it "is chainable with .recent_first" do
      newer = create(:note, title: "Reunião nova", created_at: 1.minute.from_now)

      expect(described_class.search("reunião").recent_first.to_a).to eq([ newer, meeting ])
    end

    it "does not raise on a single-character query" do
      expect { described_class.search("a").to_a }.not_to raise_error
    end

    it "ignores the book note in matches that don't appear in its title or nil content" do
      # Sanity: search doesn't crash on records with NULL content
      expect(described_class.search("Refactoring")).to contain_exactly(book)
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
