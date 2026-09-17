
import { useEffect, useState } from "react";
import moment from "moment";

const OTP_EXPIRY_MINUTES = 5;

interface UseOtpCountdownReturn {
  remainingSeconds: number;
  formattedTime: string;
  isExpired: boolean;
}

export const useOtpCountdown = (
  createdAt?: string | Date | null,
  expiryMinutes: number = OTP_EXPIRY_MINUTES
): UseOtpCountdownReturn => {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    if (!createdAt) {
      setRemainingSeconds(0);
      return;
    }

    const expiryAt = moment(createdAt).add(expiryMinutes, "minutes");

    const updateCountdown = () => {
      const seconds = expiryAt.diff(moment(), "seconds");

      setRemainingSeconds(Math.max(seconds, 0));
    };

    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [createdAt, expiryMinutes]);

  const formattedTime = moment
    .utc(remainingSeconds * 1000)
    .format("mm:ss");

  return {
    remainingSeconds,
    formattedTime,
    isExpired: remainingSeconds === 0,
  };
};