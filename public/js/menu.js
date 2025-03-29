document.addEventListener('DOMContentLoaded', () => {
    const menuForm = document.getElementById('menu-form');
    const menuItemsContainer = document.getElementById('menu-items-container');

    // Fetch and display menu items
    async function fetchMenuItems() {
        try {
            const response = await fetch('/api/menu');
            const menuItems = await response.json();
            
            menuItemsContainer.innerHTML = ''; // Clear existing items
            menuItems.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.classList.add('menu-item');
                itemElement.innerHTML = `
                    <h3>${item.name}</h3>
                    <p>Category: ${item.category}</p>
                    <p>Subcategory: ${item.subcategory}</p>
                    <p>Description: ${item.description}</p>
                    <p>Price: $${item.price.toFixed(2)}</p>
                    <div class="item-actions">
                        <button onclick="editMenuItem('${item._id}')">Edit</button>
                        <button onclick="deleteMenuItem('${item._id}')">Delete</button>
                    </div>
                `;
                menuItemsContainer.appendChild(itemElement);
            });
        } catch (error) {
            console.error('Error fetching menu items:', error);
        }
    }

    // Add new menu item
    menuForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const menuItem = {
            category: document.getElementById('category').value,
            subcategory: document.getElementById('subcategory').value,
            name: document.getElementById('item-name').value,
            description: document.getElementById('description').value,
            price: parseFloat(document.getElementById('price').value)
        };

        try {
            const response = await fetch('/api/menu', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(menuItem)
            });

            if (response.ok) {
                fetchMenuItems(); // Refresh menu items
                menuForm.reset(); // Clear form
            }
        } catch (error) {
            console.error('Error adding menu item:', error);
        }
    });

    // Edit menu item
    window.editMenuItem = async (id) => {
        // Implement edit functionality
        const updatedItem = prompt('Enter updated item details (JSON format)');
        if (updatedItem) {
            try {
                const response = await fetch(`/api/menu/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: updatedItem
                });

                if (response.ok) {
                    fetchMenuItems();
                }
            } catch (error) {
                console.error('Error updating menu item:', error);
            }
        }
    };

    // Delete menu item
    window.deleteMenuItem = async (id) => {
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const response = await fetch(`/api/menu/${id}`, {
                    method: 'DELETE'
                });

                if (response.ok) {
                    fetchMenuItems();
                }
            } catch (error) {
                console.error('Error deleting menu item:', error);
            }
        }
    };

    // Initial fetch of menu items
    fetchMenuItems();
});