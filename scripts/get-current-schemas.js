require('dotenv').config({ path: '.env.local' });
const { Client, Databases } = require('node-appwrite');

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);
const DATABASE_ID = 'koffers_poc';

async function getAllSchemas() {
  try {
    console.log('=== FETCHING ALL COLLECTION SCHEMAS ===\n');

    const collections = await databases.listCollections(DATABASE_ID);

    console.log('Found', collections.total, 'collections\n');

    for (const col of collections.collections) {
      console.log('\n' + '='.repeat(60));
      console.log('COLLECTION:', col.name, '(' + col.$id + ')');
      console.log('='.repeat(60));

      const fullCollection = await databases.getCollection(DATABASE_ID, col.$id);

      console.log('\nAttributes:');
      if (fullCollection.attributes.length === 0) {
        console.log('  (no attributes)');
      } else {
        fullCollection.attributes.forEach(attr => {
          const required = attr.required ? ' [REQUIRED]' : '';
          const array = attr.array ? ' [ARRAY]' : '';
          let typeInfo = attr.type;

          if (attr.type === 'string' && attr.size) {
            typeInfo += '(' + attr.size + ')';
          }
          if (attr.elements) {
            typeInfo += ' enum[' + attr.elements.join(', ') + ']';
          }

          console.log('  -', attr.key + ':', typeInfo + required + array);
        });
      }

      console.log('\nIndexes:');
      if (fullCollection.indexes.length === 0) {
        console.log('  (no indexes)');
      } else {
        fullCollection.indexes.forEach(idx => {
          console.log('  -', idx.key, '(' + idx.type + '):', '[' + idx.attributes.join(', ') + ']');
        });
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    collections.collections.forEach(col => {
      console.log('  -', col.$id);
    });

  } catch (error) {
    console.error('Error:', error.message);
  }
}

getAllSchemas();
