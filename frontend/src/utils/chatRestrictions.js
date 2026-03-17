const COMPLETED_RIDE_MESSAGE = 'Once the ride is completed the chat service is disabled for both the parties.';
const CANCELLED_RIDE_MESSAGE = 'This ride was cancelled; chat is disabled for both parties.';
const DEFAULT_DISABLED_MESSAGE = 'Chat is disabled for this ride.';

/**
 * Determine whether chat should be disabled based on ride/participant data.
 * @param {object} params
 * @param {object|null} params.rideInfo - Ride/trip info containing status/state fields
 * @param {object|null} params.participants - Response from getChatParticipants
 * @returns {{disabled: boolean, message: string}}
 */
export const getChatRestriction = ({ rideInfo = null, participants = null } = {}) => {
  const rideFromParticipants = participants?.ride || participants?.trip || participants?.rideInfo;
  const targetRide = rideInfo || rideFromParticipants || null;

  const statuses = [
    targetRide?.status,
    targetRide?.state,
    targetRide?.rideStatus,
    participants?.status,
    participants?.rideStatus,
  ].filter(Boolean);

  let disabled = false;
  let message = '';

  const normalizedStatuses = statuses.map((status) => String(status).toLowerCase());
  if (normalizedStatuses.some((status) => status === 'completed' || status === 'finished')) {
    disabled = true;
    message = COMPLETED_RIDE_MESSAGE;
  }

  if (normalizedStatuses.some((status) => status.includes('cancel'))) {
    disabled = true;
    message = CANCELLED_RIDE_MESSAGE;
  }

  if (participants && typeof participants.chatEnabled !== 'undefined' && participants.chatEnabled === false) {
    disabled = true;
    message = participants.chatDisabledReason || message || DEFAULT_DISABLED_MESSAGE;
  }

  return {
    disabled,
    message: disabled ? (message || DEFAULT_DISABLED_MESSAGE) : '',
    rideInfo: targetRide,
  };
};

export const CHAT_DISABLED_MESSAGES = {
  COMPLETED: COMPLETED_RIDE_MESSAGE,
  CANCELLED: CANCELLED_RIDE_MESSAGE,
  DEFAULT: DEFAULT_DISABLED_MESSAGE,
};
