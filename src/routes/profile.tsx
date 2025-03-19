import { styled } from "styled-components";
import { auth, storage } from "../firebase";
import { useState, useEffect } from "react";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { updateProfile } from "firebase/auth";
import { doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 20px;
`;

const AvatarUpload = styled.label`
  width: 80px;
  height: 80px;
  overflow: hidden;
  border-radius: 50%;
  background-color: #000;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    width: 50px;
  }
`;

const AvatarImg = styled.img`
  width: 100%;
  object-fit: cover;
`;

const AvatarInput = styled.input`
  display: none;
`;

const Name = styled.span`
  margin-top: 10px;
  font-size: 20px;
`;

const LanguageSelect = styled.select`
  padding: 8px 12px;
  border-radius: 4px;
  border: 1px solid #ccc;
  font-size: 16px;
  min-width: 200px;
`;

const LanguageLabel = styled.label`
  font-size: 16px;
  margin-bottom: 5px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 300px;
`;

// Language options
const LANGUAGES = [
  { name: "Arabic", code: "ar" },
  { name: "Bashkir", code: "ba" },
  { name: "Basque", code: "eu" },
  { name: "Belarusian", code: "be" },
  { name: "Bengali", code: "bn" },
  { name: "Bulgarian", code: "bg" },
  { name: "Cantonese", code: "yue" },
  { name: "Catalan", code: "ca" },
  { name: "Croatian", code: "hr" },
  { name: "Czech", code: "cs" },
  { name: "Danish", code: "da" },
  { name: "Dutch", code: "nl" },
  { name: "English", code: "en" },
  { name: "Esperanto", code: "eo" },
  { name: "Estonian", code: "et" },
  { name: "Finnish", code: "fi" },
  { name: "French", code: "fr" },
  { name: "Galician", code: "gl" },
  { name: "German", code: "de" },
  { name: "Greek", code: "el" },
  { name: "Hebrew", code: "he" },
  { name: "Hindi", code: "hi" },
  { name: "Hungarian", code: "hu" },
  { name: "Indonesian", code: "id" },
  { name: "Interlingua", code: "ia" },
  { name: "Irish", code: "ga" },
  { name: "Italian", code: "it" },
  { name: "Japanese", code: "ja" },
  { name: "Korean", code: "ko" },
  { name: "Latvian", code: "lv" },
  { name: "Lithuanian", code: "lt" },
  { name: "Malay", code: "ms" },
  { name: "Maltese", code: "mt" },
  { name: "Mandarin", code: "cmn" },
  { name: "Marathi", code: "mr" },
  { name: "Mongolian", code: "mn" },
  { name: "Norwegian", code: "no" },
  { name: "Persian", code: "fa" },
  { name: "Polish", code: "pl" },
  { name: "Portuguese", code: "pt" },
  { name: "Romanian", code: "ro" },
  { name: "Russian", code: "ru" },
  { name: "Slovakian", code: "sk" },
  { name: "Slovenian", code: "sl" },
  { name: "Spanish", code: "es" },
  { name: "Swahili", code: "sw" },
  { name: "Swedish", code: "sv" },
  { name: "Tamil", code: "ta" },
  { name: "Thai", code: "th" },
  { name: "Turkish", code: "tr" },
  { name: "Ukrainian", code: "uk" },
  { name: "Urdu", code: "ur" },
  { name: "Uyghur", code: "ug" },
  { name: "Vietnamese", code: "vi" },
  { name: "Welsh", code: "cy" },
];

export default function Profile() {
  const user = auth.currentUser;
  const [avatar, setAvatar] = useState(user?.photoURL);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(true);
  const firestore = getFirestore();

  useEffect(() => {
    const fetchUserLanguage = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(firestore, `users/${user.uid}`));
        if (userDoc.exists() && userDoc.data().language) {
          setLanguage(userDoc.data().language);
        } else {
          await setDoc(
            doc(firestore, `users/${user.uid}`),
            {
              language: "en",
              updatedAt: new Date(),
            },
            { merge: true }
          );
        }
        setLoading(false);
      } catch (err) {
        console.error("Error fetching user language:", err);
        setLoading(false);
      }
    };

    fetchUserLanguage();
  }, [user, firestore]);

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!user) return;
    if (files && files.length === 1) {
      const file = files[0];
      const locationRef = ref(storage, `avatars/${user?.uid}`);
      try {
        const result = await uploadBytes(locationRef, file);
        const avatarUrl = await getDownloadURL(result.ref);
        setAvatar(avatarUrl);
        await updateProfile(user, {
          photoURL: avatarUrl,
        });
        setError("");
      } catch (error) {
        console.error("Error uploading avatar:", error);
        setError(
          "Failed to upload avatar. Storage rules may need to be updated."
        );
      }
    }
  };

  const onLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);

    if (!user) return;

    try {
      await setDoc(
        doc(firestore, `users/${user.uid}`),
        {
          language: newLanguage,
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Error saving language preference:", err);
      setError("Failed to save language preference.");
    }
  };

  if (loading) {
    return <Wrapper>Loading...</Wrapper>;
  }

  return (
    <Wrapper>
      <AvatarUpload htmlFor="avatar">
        {avatar ? (
          <AvatarImg src={avatar as string} />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
            />
          </svg>
        )}
      </AvatarUpload>
      <AvatarInput
        type="file"
        accept="image/*"
        id="avatar"
        onChange={onAvatarChange}
      />
      <Name>{user?.displayName ? user?.displayName : "Anonymous"}</Name>

      <FormGroup>
        <LanguageLabel htmlFor="language-select">
          Preferred Language
        </LanguageLabel>
        <LanguageSelect
          id="language-select"
          value={language}
          onChange={onLanguageChange}
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name}
            </option>
          ))}
        </LanguageSelect>
      </FormGroup>

      {error && <span style={{ color: "red" }}>{error}</span>}
    </Wrapper>
  );
}
