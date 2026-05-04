FactoryBot.define do
  factory :note do
    sequence(:title) { |n| "Anotação #{n}" }
    content { "Conteúdo de exemplo" }

    trait :without_content do
      content { nil }
    end

    trait :with_max_title do
      title { "T" * Note::TITLE_MAX_LENGTH }
    end

    trait :with_max_content do
      content { "C" * Note::CONTENT_MAX_LENGTH }
    end
  end
end
