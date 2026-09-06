import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

/**
 * Custom hook for auto-apply functionality.
 * Handles the full auto-apply flow: POST to /jobs/:id/auto-apply,
 * open apply URL in new tab on success, and handle all error cases.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.8
 */
export default function useAutoApply() {
  const navigate = useNavigate();
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [notification, setNotification] = useState(null);

  const clearNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const autoApply = useCallback(async (jobId) => {
    // Prevent duplicate submissions (Requirement 5.4)
    if (applyingJobId) return;

    setApplyingJobId(jobId);
    setNotification(null);

    try {
      const response = await api.post(`/jobs/${jobId}/auto-apply`);
      const data = response.data;

      // Open apply URL in new tab (Requirement 5.1, 5.2)
      if (data.apply_url) {
        window.open(data.apply_url, '_blank');
      }

      // Show success notification with application details (Requirement 5.2)
      setNotification({
        type: 'success',
        message: `Application submitted for ${data.job_title} at ${data.company}`,
        details: data,
      });
    } catch (err) {
      const resp = err.response;

      if (resp && resp.status === 422 && resp.data?.error?.code === 'PROFILE_INCOMPLETE') {
        // Missing profile fields — redirect to profile (Requirement 5.6)
        const missingFields = resp.data.error.details?.missing_fields || [];
        setNotification({
          type: 'incomplete',
          message: `Please complete your profile before applying. Missing: ${missingFields.join(', ')}`,
          missingFields,
        });
        // Redirect to profile setup after a short delay so user sees the message
        setTimeout(() => navigate('/profile/setup'), 2000);
      } else if (resp && resp.status === 409 && resp.data?.error?.code === 'DUPLICATE_APPLICATION') {
        // Already applied (Requirement 5.8)
        setNotification({
          type: 'duplicate',
          message: resp.data.error.message || 'You have already applied to this job.',
        });
      } else if (resp && resp.status === 502) {
        // Auto-apply failed — show manual apply link (Requirement 5.3)
        const manualUrl = resp.data?.manual_apply_url;
        setNotification({
          type: 'error',
          message: resp.data?.error || 'Auto-apply failed. Please try applying manually.',
          manualApplyUrl: manualUrl,
        });
      } else if (resp && resp.status === 404) {
        setNotification({
          type: 'error',
          message: 'Job not found. It may have expired from the cache.',
        });
      } else {
        setNotification({
          type: 'error',
          message: 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      setApplyingJobId(null);
    }
  }, [applyingJobId, navigate]);

  return {
    autoApply,
    applyingJobId,
    notification,
    clearNotification,
  };
}
