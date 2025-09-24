import api from './api';

// Authentication services
export const authService = {
  // Register user
  register: async (userData) => {
    const response = await api.post('/users/register', userData);
    return response.data;
  },

  // Login user
  login: async (credentials) => {
    const response = await api.post('/users/login', credentials);
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await api.get('/users/profile');
    return response.data;
  },

  // Update user profile
  updateProfile: async (userData) => {
    const response = await api.put('/users/profile', userData);
    return response.data;
  },

  // Change password
  changePassword: async (passwordData) => {
    const response = await api.put('/users/change-password', passwordData);
    return response.data;
  },
  // Delete (deactivate) own account
  deleteProfile: async () => {
    try {
      console.log('Making DELETE request to /users/profile');
      const response = await api.delete('/users/profile');
      console.log('Delete API response:', response);
      return response.data;
    } catch (error) {
      console.error('Delete API error:', error);
      throw error;
    }
  },
};

// Product services
export const productService = {
  // Get all products
  getProducts: async (params = {}) => {
    const response = await api.get('/products', { params });
    return response.data;
  },

  // Get product by ID
  getProduct: async (id) => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  },

  // Create product
  createProduct: async (productData) => {
    const response = await api.post('/products', productData);
    return response.data;
  },

  // Update product
  updateProduct: async (id, productData) => {
    const response = await api.put(`/products/${id}`, productData);
    return response.data;
  },

  // Delete product
  deleteProduct: async (id) => {
    const response = await api.delete(`/products/${id}`);
    return response.data;
  },

  // Get products by seller
  getProductsBySeller: async (sellerId, params = {}) => {
    const response = await api.get(`/products/seller/${sellerId}`, { params });
    return response.data;
  },

  // Add product review
  addReview: async (productId, reviewData) => {
    const response = await api.post(`/products/${productId}/reviews`, reviewData);
    return response.data;
  },

  // Get product categories
  getCategories: async () => {
    const response = await api.get('/products/categories');
    return response.data;
  },
};

// Order services
export const orderService = {
  // Create order
  createOrder: async (orderData) => {
    const response = await api.post('/orders', orderData);
    return response.data;
  },

  // Get user orders
  getOrders: async (params = {}) => {
    const response = await api.get('/orders', { params });
    return response.data;
  },

  // Get order by ID
  getOrder: async (id) => {
    const response = await api.get(`/orders/${id}`);
    return response.data;
  },

  // Update order status
  updateOrderStatus: async (id, statusData) => {
    const response = await api.put(`/orders/${id}/status`, statusData);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (id, reason) => {
    const response = await api.put(`/orders/${id}/cancel`, { reason });
    return response.data;
  },
};

// User services (admin)
export const userService = {
  // Get all users (admin only)
  getUsers: async (params = {}) => {
    const response = await api.get('/users', { params });
    return response.data;
  },
};

// Forum services
export const forumService = {
  // Get forum categories
  getCategories: async () => {
    const response = await api.get('/forum/categories');
    return response.data;
  },

  // Get forum posts
  getPosts: async (params = {}) => {
    const response = await api.get('/forum', { params });
    return response.data;
  },

  // Get single forum post
  getPost: async (id) => {
    const response = await api.get(`/forum/${id}`);
    return response.data;
  },

  // Create forum post
  createPost: async (postData) => {
    const response = await api.post('/forum', postData);
    return response.data;
  },

  // Update forum post
  updatePost: async (id, postData) => {
    const response = await api.put(`/forum/${id}`, postData);
    return response.data;
  },

  // Delete forum post
  deletePost: async (id) => {
    const response = await api.delete(`/forum/${id}`);
    return response.data;
  },

  // Like/Unlike forum post
  toggleLikePost: async (id) => {
    const response = await api.post(`/forum/${id}/like`);
    return response.data;
  },

  // Create comment
  createComment: async (postId, commentData) => {
    const response = await api.post(`/forum/${postId}/comments`, commentData);
    return response.data;
  },

  // Update comment
  updateComment: async (commentId, commentData) => {
    const response = await api.put(`/forum/comments/${commentId}`, commentData);
    return response.data;
  },

  // Delete comment
  deleteComment: async (commentId) => {
    const response = await api.delete(`/forum/comments/${commentId}`);
    return response.data;
  },

  // Like/Unlike comment
  toggleLikeComment: async (commentId) => {
    const response = await api.post(`/forum/comments/${commentId}/like`);
    return response.data;
  },
};