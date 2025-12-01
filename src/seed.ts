import { createClient } from '@clickhouse/client';

export async function seedData() {
  console.log('Seeding data...');

  const client = createClient({
    host: 'http://localhost:8123',
    username: 'default',
    password: '',
  });

  try {
    // Create a table
    await client.exec({
      query: `
        CREATE TABLE IF NOT EXISTS test_data (
          id UInt32,
          name String,
          value Float32
        ) ENGINE = MergeTree()
        ORDER BY id;
      `,
    });
    console.log('Table "test_data" created or already exists.');

    // Insert some mock data
    await client.insert({
      table: 'test_data',
      values: [
        { id: 1, name: 'one', value: 1.0 },
        { id: 2, name: 'two', value: 2.0 },
        { id: 3, name: 'three', value: 3.0 },
      ],
      format: 'JSONEachRow',
    });
    console.log('Mock data inserted.');

  } catch (error) {
    console.error('Error seeding data:', error);
    throw error;
  } finally {
    await client.close();
  }

  console.log('Data seeding complete.');
}