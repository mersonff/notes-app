class CreateNotes < ActiveRecord::Migration[8.1]
  def change
    create_table :notes do |t|
      t.string :title, null: false, limit: 120
      t.text :content

      t.timestamps
    end

    # Listing is "newest first" by default; this index keeps the
    # ORDER BY off the planner's hot path even on large tables.
    add_index :notes, :created_at
  end
end
