import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { forumService } from '../../services';
import LoadingSpinner from '../common/LoadingSpinner';

const CreateEditForumPost = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams(); // For editing existing post
  const isEditing = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: []
  });
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fetchingPost, setFetchingPost] = useState(isEditing);

  // Hardcoded categories
  const categories = [
    { value: 'general', label: 'General Discussion', description: 'General farming topics and discussions' },
    { value: 'crop_management', label: 'Crop Management', description: 'Crop cultivation, planting, and harvesting' },
    { value: 'livestock', label: 'Livestock', description: 'Animal farming and livestock management' },
    { value: 'equipment', label: 'Equipment', description: 'Farming tools and machinery' },
    { value: 'weather', label: 'Weather', description: 'Weather conditions and climate discussions' },
    { value: 'market_prices', label: 'Market Prices', description: 'Commodity prices and market trends' },
    { value: 'pest_control', label: 'Pest Control', description: 'Pest management and disease control' },
    { value: 'soil_health', label: 'Soil Health', description: 'Soil management and fertility' },
    { value: 'organic_farming', label: 'Organic Farming', description: 'Organic and sustainable farming practices' },
    { value: 'technology', label: 'Technology', description: 'Agricultural technology and innovations' },
    { value: 'government_schemes', label: 'Government Schemes', description: 'Government programs and subsidies' },
    { value: 'success_stories', label: 'Success Stories', description: 'Inspiring farming success stories' }
  ];

  useEffect(() => {
    if (isEditing) {
      fetchPost();
    }
  }, [id]);

  const fetchPost = async () => {
    try {
      setFetchingPost(true);
      const data = await forumService.getPost(id);
      
      if (data.success) {
        const post = data.data.post;
        
        // Check if user is the author
        if (post.author._id !== user.id) {
          setError('You are not authorized to edit this post');
          return;
        }
        
        setFormData({
          title: post.title,
          content: post.content,
          category: post.category,
          tags: post.tags || []
        });
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch post');
      console.error('Error fetching post:', error);
    } finally {
      setFetchingPost(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim()) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let data;
      if (isEditing) {
        data = await forumService.updatePost(id, formData);
      } else {
        data = await forumService.createPost(formData);
      }

      if (data.success) {
        navigate(isEditing ? `/forum/post/${id}` : `/forum/post/${data.data._id}`);
      } else {
        setError(data.message || `Failed to ${isEditing ? 'update' : 'create'} post`);
      }
    } catch (error) {
      setError(`Failed to ${isEditing ? 'update' : 'create'} post`);
      console.error('Error submitting post:', error);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingPost) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditing ? 'Edit Post' : 'Create New Post'}
          </h1>
          <p className="text-gray-600 mt-2">
            {isEditing ? 'Update your forum post' : 'Share your knowledge with the farming community'}
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                maxLength={200}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter a descriptive title for your post..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.title.length}/200 characters
              </p>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
              {categories.find(cat => cat.value === formData.category) && (
                <p className="text-sm text-gray-500 mt-1">
                  {categories.find(cat => cat.value === formData.category).description}
                </p>
              )}
            </div>

            {/* Content */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Content *
              </label>
              <textarea
                id="content"
                name="content"
                value={formData.content}
                onChange={handleInputChange}
                required
                rows={12}
                maxLength={5000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Share your knowledge, ask questions, or discuss farming topics..."
              />
              <p className="text-sm text-gray-500 mt-1">
                {formData.content.length}/5000 characters
              </p>
            </div>

            {/* Tags */}
            <div>
              <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                Tags (Optional)
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyPress={handleTagKeyPress}
                  maxLength={30}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Add a tag..."
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!tagInput.trim() || formData.tags.length >= 5}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-2 text-green-600 hover:text-green-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              <p className="text-sm text-gray-500">
                Add up to 5 tags to help others find your post. Press Enter or click Add to add a tag.
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6">
              <button
                type="button"
                onClick={() => navigate('/forum')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={loading || !formData.title.trim() || !formData.content.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
              >
                {loading && (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {loading 
                  ? (isEditing ? 'Updating...' : 'Creating...') 
                  : (isEditing ? 'Update Post' : 'Create Post')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateEditForumPost;