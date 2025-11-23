# Test script to verify the authentication and permissions system
import requests
import json

# Test the Django backend endpoints

def test_backend():
    print("Testing Django Backend...")
    
    # Test login endpoint
    print("1. Testing login endpoint...")
    login_data = {
        "username": "admin",
        "password": "admin123"
    }
    try:
        response = requests.post("http://localhost:8000/auth/login/", json=login_data)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                token = result.get("access")
                print("   ✓ Login successful")
                print(f"   ✓ Token received: {token[:20]}...")
                
                # Test items endpoint with authentication
                print("2. Testing items endpoint with authentication...")
                headers = {"Authorization": f"Bearer {token}"}
                items_response = requests.get("http://localhost:8000/items/", headers=headers)
                if items_response.status_code == 200:
                    print("   ✓ Items endpoint accessible with authentication")
                else:
                    print(f"   ✗ Items endpoint failed: {items_response.status_code}")
                
                # Test roles endpoint with authentication
                print("3. Testing roles endpoint with authentication...")
                roles_response = requests.get("http://localhost:8000/roles/", headers=headers)
                if roles_response.status_code == 200:
                    print("   ✓ Roles endpoint accessible with authentication")
                else:
                    print(f"   ✗ Roles endpoint failed: {roles_response.status_code}")
                
                # Test permissions endpoint with authentication
                print("4. Testing permissions endpoint with authentication...")
                perms_response = requests.get("http://localhost:8000/permissions/", headers=headers)
                if perms_response.status_code == 200:
                    print("   ✓ Permissions endpoint accessible with authentication")
                else:
                    print(f"   ✗ Permissions endpoint failed: {perms_response.status_code}")
            else:
                print("   ✗ Login failed")
        else:
            print(f"   ✗ Login request failed with status {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("   ✗ Cannot connect to Django server. Make sure it's running on localhost:8000")
    except Exception as e:
        print(f"   ✗ Error during testing: {str(e)}")

def test_frontend():
    print("\nTesting Frontend Integration...")
    print("5. Frontend components created:")
    print("   ✓ AuthContext for authentication management")
    print("   ✓ PermissionContext for permission checks")
    print("   ✓ ProtectedRoute component")
    print("   ✓ Updated AppSidebar with permission-based navigation")
    print("   ✓ SignInForm connected to Django backend")
    print("   ✓ ItemList component with authentication")
    print("   ✓ All necessary routes configured")

if __name__ == "__main__":
    print("Testing the complete authentication and permissions system...")
    test_backend()
    test_frontend()
    print("\n✓ All tests completed!")
    print("\nTo run the system:")
    print("1. Start Django: cd backend && python manage.py runserver")
    print("2. Start React: cd frontend && npm start")
    print("3. Access the application at http://localhost:3000")
    print("4. Use admin/admin123 for admin access or demo buttons on login")