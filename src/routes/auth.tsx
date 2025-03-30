import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import styled from 'styled-components';

// Using direct Firebase Authentication for phone number authentication 
// (FirebaseUI is not compatible with Firebase v11.5.0)
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from 'firebase/auth';

// Add RecaptchaVerifier to the global Window interface
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier;
  }
}

const AuthContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.h1`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: center;
`;

const Description = styled.p`
  margin-bottom: 1.5rem;
  text-align: center;
  color: #666;
  font-size: 0.9rem;
`;

const FormContainer = styled.div`
  margin-top: 2rem;
`;

const Input = styled.input`
  width: 100%;
  padding: 0.75rem;
  margin-bottom: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
`;

const Button = styled.button`
  width: 100%;
  padding:.75rem;
  background-color: #1a73e8;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  
  &:hover {
    background-color: #0d62cb;
  }
  
  &:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
`;

const Message = styled.div`
  margin-top: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: center;
`;

const ErrorMessage = styled(Message)`
  background-color: #fdeded;
  color: #5f2120;
`;

const SuccessMessage = styled(Message)`
  background-color: #edf7ed;
  color: #1e4620;
`;

const HelpText = styled.p`
  font-size: 0.8rem;
  color: #666;
  margin-top: -0.5rem;
  margin-bottom: 1rem;
`;

const ValidationMessage = styled.p`
  font-size: 0.8rem;
  color: #d93025;
  margin-top: -0.5rem;
  margin-bottom: 1rem;
`;

export default function Auth() {
  const navigate = useNavigate();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationId, setVerificationId] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isValidPhoneNumber, setIsValidPhoneNumber] = useState(false);
  
  // Handle phone number input change
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Only allow digits, spaces, and hyphens for better user experience
    const filtered = input.replace(/[^\d\s-]/g, '');
    setPhoneNumber(filtered);
    
    // Validate on every change
    validatePhoneNumber(filtered);
  };
  
  // Validate Korean phone number format
  const validatePhoneNumber = (input: string) => {
    // Clean up the input (remove non-digits)
    const cleanNumber = input.replace(/\D/g, '');
    
    // Allow more flexible validation to avoid frustrating users
    // Allow 10-11 digits Korean mobile numbers
    // Starting with 01X where X is usually 0, 1, 6, 7, 8, or 9
    const minLength = 10; // Minimum length for a valid Korean mobile number
    
    // Basic check: starts with 01 and has at least 10 digits
    setIsValidPhoneNumber(cleanNumber.startsWith('01') && cleanNumber.length >= minLength);
  };
  
  // Format phone number for Firebase (E.164 format)
  const formatPhoneNumberForFirebase = (input: string): string => {
    // Remove any non-digit characters
    let cleaned = input.replace(/\D/g, '');
    
    // Handle all possible formats and ensure strict E.164 format
    // E.164 format is: +[country code][number without leading 0]
    
    // If already in E.164 format
    if (cleaned.startsWith('82') && cleaned.length >= 11) {
      return '+' + cleaned;
    }
    
    // If starts with '+82'
    if (cleaned.startsWith('+82') && cleaned.length >= 12) {
      return cleaned;
    }
    
    // If starts with '0' (most common case for Korean numbers)
    if (cleaned.startsWith('0') && cleaned.length >= 10) {
      return '+82' + cleaned.substring(1);
    }
    
    // If number doesn't start with 0 but is a valid Korean mobile number
    // This assumes it's already without the leading 0
    if (cleaned.length >= 9) {
      return '+82' + cleaned;
    }
    
    // Default case - just prepend +82
    return '+82' + cleaned;
  };

  useEffect(() => {
    // Check if user is already signed in
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        // User is already signed in, redirect to home
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (err) {
        console.error('Error clearing existing reCAPTCHA:', err);
      }
    }
    
    try {
      console.log('Setting up new reCAPTCHA verifier');
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'normal',
        'callback': () => {
          console.log('reCAPTCHA verified successfully');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired, refreshing...');
          setupRecaptcha();
        }
      });
      
      window.recaptchaVerifier.render()
        .then(() => console.log('reCAPTCHA rendered successfully'))
        .catch((err) => console.error('Error rendering reCAPTCHA:', err));
    } catch (err) {
      console.error('Failed to set up reCAPTCHA:', err);
      setError('Failed to set up phone verification. Please refresh and try again.');
    }
  };

  const sendVerificationCode = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Format the phone number for Firebase
      const formattedPhoneNumber = formatPhoneNumberForFirebase(phoneNumber);
      
      console.log('Sending verification code to:', formattedPhoneNumber);
      
      // Verify reCAPTCHA is set up
      if (!window.recaptchaVerifier) {
        console.log('reCAPTCHA not set up, recreating...');
        setupRecaptcha();
      }
      
      // Send verification code directly with signInWithPhoneNumber
      // Note: We don't need to create a phoneAuthProvider instance since
      // signInWithPhoneNumber handles this internally
      const confirmationResult = await signInWithPhoneNumber(
        auth, 
        formattedPhoneNumber, 
        window.recaptchaVerifier
      );
      
      console.log('Verification code sent successfully');
      setVerificationId(confirmationResult);
      setMessage('Verification code sent to your phone!');
    } catch (err) {
      console.error('Error sending verification code:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send verification code';
      setError(errorMessage);
      
      // Reset the reCAPTCHA on error
      console.log('Resetting reCAPTCHA after error');
      try {
        if (window.recaptchaVerifier) {
          window.recaptchaVerifier.clear();
        }
        setupRecaptcha();
      } catch (clearErr) {
        console.error('Error resetting reCAPTCHA:', clearErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async () => {
    if (!verificationId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Confirm the verification code
      await verificationId.confirm(verificationCode);
      
      // User is now signed in
      setMessage('Successfully signed in!');
      
      // Redirect to home page
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify code');
      console.error('Error verifying code:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Setup reCAPTCHA when component mounts
    try {
      setupRecaptcha();
    } catch (err) {
      console.error('Error setting up reCAPTCHA:', err);
      setError('Failed to set up phone verification. Please try again.');
    }
    
    return () => {
      // Clean up reCAPTCHA when component unmounts
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {
          console.error('Error clearing reCAPTCHA:', err);
        }
      }
    };
  }, []);

  return (
    <AuthContainer>
      <Header>Sign in with Phone Number</Header>
      <Description>
        Please enter your Korean mobile number to receive a verification code.
      </Description>
      
      <FormContainer>
        {!verificationId ? (
          <>
            <Input
              type="tel"
              placeholder="Phone number (e.g., 01012345678)"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
              disabled={loading}
            />
            {phoneNumber && !isValidPhoneNumber ? (
              <ValidationMessage>
                Please enter a valid Korean mobile number (e.g., 01012345678)
              </ValidationMessage>
            ) : (
              <HelpText>Enter your phone number without spaces or dashes.</HelpText>
            )}
            <div id="recaptcha-container"></div>
            <Button 
              onClick={sendVerificationCode}
              disabled={!isValidPhoneNumber || loading}
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </Button>
          </>
        ) : (
          <>
            <Input
              type="text"
              placeholder="Enter verification code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              disabled={loading}
            />
            <Button 
              onClick={verifyCode} 
              disabled={!verificationCode || loading}
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </Button>
          </>
        )}
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        {message && <SuccessMessage>{message}</SuccessMessage>}
      </FormContainer>
    </AuthContainer>
  );
} 