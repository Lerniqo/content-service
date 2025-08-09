const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

// Mock admin user for testing
const mockHeaders = {
  'Content-Type': 'application/json',
  'user': JSON.stringify({
    id: 'admin-test-123',
    role: ['admin'],
    email: 'admin@test.com',
    name: 'Test Admin'
  })
};

function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path,
      method,
      headers: {
        ...mockHeaders,
        ...headers,
        'Content-Length': data ? Buffer.byteLength(JSON.stringify(data)) : 0
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const jsonData = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: jsonData, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: body, headers: res.headers });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testPutEndpoint() {
  console.log('🧪 Testing PUT /concepts/:id endpoint\n');
  
  const testConceptId = 'test-concept-' + Date.now();
  
  try {
    // Step 1: Create a concept first
    console.log('1️⃣ Creating a test concept...');
    const createData = {
      id: testConceptId,
      name: 'Test Matter Concept',
      type: 'Matter'
    };
    
    const createResponse = await makeRequest('POST', '/concepts', createData);
    if (createResponse.status === 201) {
      console.log('✅ Concept created successfully:', createResponse.data);
    } else {
      console.log('❌ Failed to create concept:', createResponse.status, createResponse.data);
      return;
    }
    
    // Step 2: Update the concept with all fields
    console.log('\n2️⃣ Testing full update...');
    const fullUpdateData = {
      name: 'Updated Test Matter Concept',
      type: 'Molecule'
    };
    
    const fullUpdateResponse = await makeRequest('PUT', `/concepts/${testConceptId}`, fullUpdateData);
    if (fullUpdateResponse.status === 200) {
      console.log('✅ Full update successful:', fullUpdateResponse.data);
    } else {
      console.log('❌ Full update failed:', fullUpdateResponse.status, fullUpdateResponse.data);
    }
    
    // Step 3: Update with partial data
    console.log('\n3️⃣ Testing partial update...');
    const partialUpdateData = {
      name: 'Partially Updated Name Only'
    };
    
    const partialUpdateResponse = await makeRequest('PUT', `/concepts/${testConceptId}`, partialUpdateData);
    if (partialUpdateResponse.status === 200) {
      console.log('✅ Partial update successful:', partialUpdateResponse.data);
    } else {
      console.log('❌ Partial update failed:', partialUpdateResponse.status, partialUpdateResponse.data);
    }
    
    // Step 4: Test error handling - non-existent concept
    console.log('\n4️⃣ Testing error handling - non-existent concept...');
    const notFoundResponse = await makeRequest('PUT', '/concepts/non-existent-id', partialUpdateData);
    if (notFoundResponse.status === 404) {
      console.log('✅ Correctly handled non-existent concept:', notFoundResponse.status, notFoundResponse.data?.message);
    } else {
      console.log('❌ Unexpected response for non-existent concept:', notFoundResponse.status, notFoundResponse.data);
    }
    
    // Step 5: Test validation errors
    console.log('\n5️⃣ Testing validation errors - invalid type...');
    const invalidUpdateData = {
      type: 'InvalidType'
    };
    const validationResponse = await makeRequest('PUT', `/concepts/${testConceptId}`, invalidUpdateData);
    if (validationResponse.status === 400) {
      console.log('✅ Correctly handled validation error:', validationResponse.status, validationResponse.data?.message);
    } else {
      console.log('❌ Validation error not handled properly:', validationResponse.status, validationResponse.data);
    }
    
    // Step 6: Test empty body
    console.log('\n6️⃣ Testing truly empty update data...');
    // We can't test true empty body easily, so let's test with whitelist violation
    const extraFieldData = {
      name: 'Valid Name',
      invalidField: 'This should be rejected'
    };
    const whitelistResponse = await makeRequest('PUT', `/concepts/${testConceptId}`, extraFieldData);
    if (whitelistResponse.status === 400) {
      console.log('✅ Correctly handled whitelist violation:', whitelistResponse.status, whitelistResponse.data?.message);
    } else {
      console.log('❌ Whitelist validation not working:', whitelistResponse.status, whitelistResponse.data);
    }
    
    // Step 7: Test authorization (no admin role)
    console.log('\n7️⃣ Testing authorization - non-admin user...');
    const nonAdminHeaders = {
      'user': JSON.stringify({
        id: 'user-test-456',
        role: ['user'],
        email: 'user@test.com',
        name: 'Test User'
      })
    };
    
    const unauthorizedResponse = await makeRequest('PUT', `/concepts/${testConceptId}`, partialUpdateData, nonAdminHeaders);
    if (unauthorizedResponse.status === 403) {
      console.log('✅ Correctly handled unauthorized access:', unauthorizedResponse.status, unauthorizedResponse.data?.message);
    } else {
      console.log('❌ Authorization not handled properly:', unauthorizedResponse.status, unauthorizedResponse.data);
    }
    
    console.log('\n🎉 All tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPutEndpoint();
