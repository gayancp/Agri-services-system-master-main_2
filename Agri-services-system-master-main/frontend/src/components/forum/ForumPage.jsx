import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { forumService } from '../../services';
import LoadingSpinner from '../common/LoadingSpinner';

const ForumPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState({
    category: 'all',
    sortBy: 'lastActivity',
    sortOrder: 'desc',
    search: ''
  });
  const [pagination, setPagination] = useState({
    current: 1,
    total: 1,
    count: 0,
    totalPosts: 0
  });

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
    fetchPosts();
  }, [filter]);

  const fetchPosts = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page: page.toString(),
        limit: '10',
        ...filter
      };

      const data = await forumService.getPosts(params);
      
      if (data.success) {
        setPosts(data.data.posts);
        setPagination(data.data.pagination);
      } else {
        setError(data.message);
      }
    } catch (error) {
      setError('Failed to fetch forum posts');
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPosts(1);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryLabel = (categoryValue) => {
    const category = categories.find(cat => cat.value === categoryValue);
    return category ? category.label : categoryValue;
  };

  if (loading && posts.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Community Forum</h1>
              <p className="text-gray-600">Connect with fellow farmers, share experiences, and get support from the community</p>
            </div>
            {user && (
              <Link
                to="/forum/new"
                className="mt-4 md:mt-0 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors inline-flex items-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Post
              </Link>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search posts..."
                  value={filter.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </form>

            {/* Category Filter */}
            <div className="flex items-center gap-4">
              <select
                value={filter.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>

              {/* Sort Filter */}
              <select
                value={filter.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="lastActivity">Latest Activity</option>
                <option value="createdAt">Newest Posts</option>
                <option value="views">Most Viewed</option>
                <option value="commentCount">Most Discussed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Posts List */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          {posts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No posts found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filter.search || filter.category !== 'all' 
                  ? 'Try adjusting your search or filters' 
                  : 'Be the first to start a discussion!'}
              </p>
              {user && (filter.search || filter.category !== 'all') === false && (
                <div className="mt-6">
                  <Link
                    to="/forum/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                  >
                    <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Post
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {posts.map(post => (
                <div key={post._id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {post.isPinned && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                            Pinned
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {getCategoryLabel(post.category)}
                        </span>
                      </div>
                      
                      <Link 
                        to={`/forum/post/${post._id}`}
                        className="block group"
                      >
                        <h3 className="text-lg font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                          {post.title}
                        </h3>
                      </Link>
                      
                      <p className="text-gray-600 mt-2 line-clamp-2">
                        {post.content.substring(0, 200)}...
                      </p>
                      
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-3">
                          {post.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center text-sm text-gray-500">
                          <span className="font-medium text-gray-900">
                            {post.author?.firstName} {post.author?.lastName}
                          </span>
                          <span className="mx-2">•</span>
                          <span>{formatDate(post.createdAt)}</span>
                          {post.lastActivity !== post.createdAt && (
                            <>
                              <span className="mx-2">•</span>
                              <span>Last activity: {formatDate(post.lastActivity)}</span>
                            </>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            {post.views}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {post.commentCount}
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                            {post.likeCount || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.total > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing {posts.length} of {pagination.totalPosts} posts
            </div>
            <div className="flex gap-2">
              {pagination.current > 1 && (
                <button
                  onClick={() => fetchPosts(pagination.current - 1)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              
              {Array.from({ length: Math.min(5, pagination.total) }, (_, i) => {
                const page = i + 1;
                const isActive = page === pagination.current;
                return (
                  <button
                    key={page}
                    onClick={() => fetchPosts(page)}
                    className={`px-3 py-2 rounded-md text-sm font-medium ${
                      isActive
                        ? 'bg-green-600 text-white'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              
              {pagination.current < pagination.total && (
                <button
                  onClick={() => fetchPosts(pagination.current + 1)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumPage;