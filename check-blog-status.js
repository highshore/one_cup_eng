// Quick script to check blog post statuses in Firestore
// Run with: node check-blog-status.js

const admin = require('firebase-admin');
const serviceAccount = require('./firebase_service_account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkBlogPosts() {
  try {
    console.log('Checking blog posts in Firestore...\n');
    
    const snapshot = await db.collection('blog_posts').get();
    
    if (snapshot.empty) {
      console.log('❌ No blog posts found in Firestore!');
      return;
    }
    
    console.log(`Found ${snapshot.size} blog post(s):\n`);
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const status = data.status || 'NO STATUS';
      const statusEmoji = status === 'published' ? '✅' : '❌';
      
      console.log(`${statusEmoji} ID: ${doc.id}`);
      console.log(`   Title: ${data.title || 'No title'}`);
      console.log(`   Status: ${status}`);
      console.log(`   Created: ${data.createdAt?.toDate?.() || 'Unknown'}`);
      console.log('');
    });
    
    const publishedCount = snapshot.docs.filter(doc => doc.data().status === 'published').length;
    console.log(`\n📊 Summary: ${publishedCount}/${snapshot.size} posts are published`);
    
    if (publishedCount < snapshot.size) {
      console.log('\n⚠️  Some posts are not published! They will return 404 for non-admin users.');
      console.log('   To fix: Update their status to "published" in Firestore or via the admin panel.');
    }
    
  } catch (error) {
    console.error('Error checking blog posts:', error);
  } finally {
    process.exit(0);
  }
}

checkBlogPosts();

