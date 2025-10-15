import React, { useState } from 'react';
import { forumService } from '../../services';

const ForumComment = ({ comment, postId, currentUser, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [liked, setLiked] = useState(
    currentUser ? comment.likes?.some(like => like.user === currentUser.id) : false
  );
  const [likeCount, setLikeCount] = useState(comment.likeCount || 0);
  const [submitting, setSubmitting] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState(comment.replies || []);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleLike = async () => {
    if (!currentUser) return;

    try {
      const data = await forumService.toggleLikeComment(comment._id);
      
      if (data.success) {
        setLiked(data.data.liked);
        setLikeCount(data.data.likeCount);
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;

    try {
      setSubmitting(true);
      const data = await forumService.updateComment(comment._id, { content: editContent });
      
      if (data.success) {
        onUpdate(data.data);
        setEditing(false);
      }
    } catch (error) {
      console.error('Error updating comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const data = await forumService.deleteComment(comment._id);
      
      if (data.success) {
        onDelete(comment._id);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim() || !currentUser) return;

    try {
      setSubmitting(true);
      const data = await forumService.createComment(postId, { 
        content: replyContent,
        parentCommentId: comment._id 
      });
      
      if (data.success) {
        setReplies([...replies, data.data]);
        setReplyContent('');
        setShowReplyForm(false);
      }
    } catch (error) {
      console.error('Error adding reply:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const canModify = currentUser && (
    currentUser.id === comment.author._id || 
    currentUser.role === 'admin'
  );

  if (comment.isDeleted) {
    return (
      <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="w-10 h-10 bg-gray-400 rounded-full flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-gray-500 italic">[This comment has been deleted ]</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-white font-medium text-sm">
          {comment.author?.firstName?.charAt(0)}{comment.author?.lastName?.charAt(0)}
        </span>
      </div>
      
      <div className="flex-1">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">
                {comment.author?.firstName} {comment.author?.lastName}
              </span>
              <span className="text-sm text-gray-500">
                {formatDate(comment.createdAt)}
              </span>
              {comment.isEdited && (
                <span className="text-xs text-gray-400">(edited)</span>
              )}
            </div>
            
            {canModify && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setEditing(!editing)}
                  className="text-gray-600 hover:text-blue-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={handleDelete}
                  className="text-gray-600 hover:text-red-600"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          
          {editing ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                maxLength={2000}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {editContent.length}/2000 characters
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditing(false);
                      setEditContent(comment.content);
                    }}
                    className="px-3 py-1 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEdit}
                    disabled={!editContent.trim() || submitting}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                  >
                    {submitting ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-900 whitespace-pre-wrap">
              {comment.content}
            </p>
          )}
        </div>
        
        {/* Comment Actions 
        <div className="flex items-center gap-4 mt-2 text-sm">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 ${
              liked ? 'text-red-600' : 'text-gray-600 hover:text-red-600'
            }`}
          >
            <svg 
              className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} 
              fill={liked ? 'currentColor' : 'none'} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likeCount}
          </button>
          
          {currentUser && (
            <button
              onClick={() => setShowReplyForm(!showReplyForm)}
              className="text-gray-600 hover:text-green-600"
            >
              Reply
            </button>
          )}
        </div>

        {/* Reply Form */}
        {showReplyForm && (
          <form onSubmit={handleReply} className="mt-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-medium text-xs">
                  {currentUser?.firstName?.charAt(0)}{currentUser?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  maxLength={2000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {replyContent.length}/2000 characters
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowReplyForm(false);
                        setReplyContent('');
                      }}
                      className="px-3 py-1 text-xs border border-gray-300 rounded text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!replyContent.trim() || submitting}
                      className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
                    >
                      {submitting ? 'Posting...' : 'Post Reply'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Replies */}
        {replies.length > 0 && (
          <div className="mt-4 space-y-4">
            {replies.map(reply => (
              <ForumComment
                key={reply._id}
                comment={reply}
                postId={postId}
                currentUser={currentUser}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ForumComment;