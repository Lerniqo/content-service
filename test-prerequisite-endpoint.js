// This is a simple test to verify the new endpoint works
const baseUrl = 'http://localhost:3000';

// Mock data for testing
const testData = {
  conceptId: 'test-concept-123',
  prerequisiteId: 'test-prerequisite-456'
};

// Mock admin user for testing
const mockUser = {
  id: 'admin-123',
  role: ['admin'],
  email: 'admin@test.com',
  name: 'Test Admin'
};

async function testPrerequisiteEndpoint() {
  try {
    const response = await fetch(`${baseUrl}/concepts/${testData.conceptId}/prerequisites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'user': JSON.stringify(mockUser)
      },
      body: JSON.stringify({
        prerequisiteId: testData.prerequisiteId
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', result);

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Test endpoint appears to work correctly');
    } else {
      console.log('❌ Test failed with status:', response.status);
    }
  } catch (error) {
    console.error('Error testing endpoint:', error.message);
  }
}

if (require.main === module) {
  testPrerequisiteEndpoint();
}

module.exports = { testPrerequisiteEndpoint };
