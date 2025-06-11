import { collection, doc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

// Sample data matching your mobile schema
const sampleMeetupData = {
  wst_korea_univ_001: {
    date_time: Timestamp.fromDate(new Date("2024-02-07T17:00:00+09:00")),
    description:
      "월가 담화에서는 The Wall Street Journal에서 기사 2개를 선정하여 각각 1시간씩, 총 2시간 토의를 합니다. 비즈니스 영어와 시사 토론 실력을 향상시키고 싶은 분들에게 완벽한 기회입니다.",
    duration_minutes: 120,
    image_urls: [
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&h=600&fit=crop",
    ],
    leaders: ["3875867942"],
    location: [
      "스타벅스 고대안암병원점",
      "서울특별시 성북구 안암동5가 126-1",
      "nmap://search?query=%EC%8A%A4%ED%83%80%EB%B2%85%EC%8A%A4%20%EA%B3%A0%EB%8C%80%EC%95%88%EC%95%94%EB%B3%91%EC%9B%90%EC%A0%90&zoom=15",
      37.5871583,
      127.0270049,
      "고대병원 입구 쪽",
    ],
    lockdown_minutes: 0,
    max_participants: 30,
    participants: [
      "user1",
      "user2",
      "user3",
      "user4",
      "user5",
      "user6",
      "user7",
      "user8",
    ],
    title: "WST Korea Univ | 월가 담화 고려대 정모",
    topics: [
      { topic_id: "DOAwVGpAXcbC9UKIXJ8m" },
      { topic_id: "TC8wkLHs9yqKnFREIWu6" },
    ],
  },
  english_speaking_practice_001: {
    date_time: Timestamp.fromDate(new Date("2025-01-15T19:00:00+09:00")), // Future date
    description:
      "Join us for a relaxed English conversation practice session. Perfect for beginners who want to improve their speaking confidence in a supportive environment.",
    duration_minutes: 90,
    image_urls: [
      "https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=800&h=600&fit=crop",
    ],
    leaders: ["leader_emma"],
    location: [
      "강남역 2번 출구 스타벅스",
      "서울특별시 강남구 강남대로 지하 396",
      "https://map.naver.com/v5/search/강남역%202번출구",
      37.4979,
      127.0276,
      "지하철 출구에서 도보 1분",
    ],
    lockdown_minutes: 10,
    max_participants: 15,
    participants: ["user1", "user2", "user3", "user4", "user5"],
    title: "English Speaking Practice - Beginner Friendly",
    topics: [
      { topic_id: "daily_routines_topic" },
      { topic_id: "travel_culture_topic" },
    ],
  },
  business_english_workshop_001: {
    date_time: Timestamp.fromDate(new Date("2025-01-20T14:00:00+09:00")), // Future date
    description:
      "Learn essential business English phrases and practice professional communication skills. Great for working professionals looking to advance their careers.",
    duration_minutes: 180,
    image_urls: [
      "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&h=600&fit=crop",
    ],
    leaders: ["leader_david"],
    location: [
      "홍대문화공간",
      "서울특별시 마포구 와우산로 29길 19",
      "https://map.naver.com/v5/search/홍대문화공간",
      37.5563,
      126.9234,
      "홍익대학교 정문에서 도보 5분",
    ],
    lockdown_minutes: 30,
    max_participants: 12,
    participants: ["user1", "user2", "user3"],
    title: "Business English Workshop",
    topics: [
      { topic_id: "business_communication_topic" },
      { topic_id: "presentation_skills_topic" },
    ],
  },
  movie_night_discussion_001: {
    date_time: Timestamp.fromDate(new Date("2025-01-25T18:30:00+09:00")), // Future date
    description:
      "Watch an English movie together and discuss it afterwards. Improve your listening skills while having fun! Popcorn and drinks included.",
    duration_minutes: 150,
    image_urls: [
      "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&h=600&fit=crop",
      "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=800&h=600&fit=crop",
    ],
    leaders: ["leader_rachel"],
    location: [
      "명동커뮤니티센터",
      "서울특별시 중구 명동2가 54-1",
      "https://map.naver.com/v5/search/명동커뮤니티센터",
      37.5636,
      126.9831,
      "명동역 6번 출구에서 도보 3분",
    ],
    lockdown_minutes: 0,
    max_participants: 20,
    participants: [
      "user1",
      "user2",
      "user3",
      "user4",
      "user5",
      "user6",
      "user7",
      "user8",
      "user9",
      "user10",
      "user11",
      "user12",
      "user13",
      "user14",
      "user15",
      "user16",
      "user17",
      "user18",
      "user19",
      "user20",
    ],
    title: "English Movie Night & Discussion",
    topics: [
      { topic_id: "movie_analysis_topic" },
      { topic_id: "character_discussion_topic" },
    ],
  },
};

// Function to import sample data into Firestore
export const importSampleMeetupData = async (): Promise<void> => {
  try {
    console.log("🚀 Starting to import sample meetup data to Firestore...");

    const meetupCollection = collection(db, "meetup");

    for (const [docId, data] of Object.entries(sampleMeetupData)) {
      console.log(`📝 Creating document: ${docId}`);

      const docRef = doc(meetupCollection, docId);
      await setDoc(docRef, data);

      console.log(`✅ Successfully created: ${data.title}`);
    }

    console.log("🎉 All sample meetup data imported successfully!");
    console.log(
      `📊 Total events created: ${Object.keys(sampleMeetupData).length}`
    );
  } catch (error) {
    console.error("❌ Error importing sample data:", error);
    throw error;
  }
};

// Function to check if data already exists
export const checkExistingData = async (): Promise<boolean> => {
  try {
    const meetupCollection = collection(db, "meetup");
    const firstDocRef = doc(meetupCollection, "wst_korea_univ_001");
    const docSnapshot = await import("firebase/firestore").then(({ getDoc }) =>
      getDoc(firstDocRef)
    );

    return docSnapshot.exists();
  } catch (error) {
    console.error("Error checking existing data:", error);
    return false;
  }
};

// Main function to run the import
export const runImport = async (force: boolean = false): Promise<void> => {
  try {
    if (!force) {
      const hasExistingData = await checkExistingData();
      if (hasExistingData) {
        console.log(
          "⚠️  Sample data already exists. Use force=true to overwrite."
        );
        console.log("Example: runImport(true)");
        return;
      }
    }

    await importSampleMeetupData();
  } catch (error) {
    console.error("Failed to import sample data:", error);
  }
};

// Export for easy console usage
if (typeof window !== "undefined") {
  (window as any).importMeetupData = runImport;
  console.log(
    "💡 You can run importMeetupData() in the console to import sample data"
  );
}

export default runImport;
