import { createClient } from '@clickhouse/client';

export async function generateAndExecuteQueries() {
  console.log('Generating and executing queries...');

  const client = createClient({
    host: 'http://localhost:8123',
    username: 'default',
    password: '',
  });

  try {
    // Execute a query
    const resultSet = await client.query({
      query: 'SELECT * FROM test_data',
      format: 'JSONEachRow',
    });

    const data = await resultSet.json();
    console.log('Query result:', data);

  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    await client.close();
  }

  console.log('Query generation and execution complete.');
}