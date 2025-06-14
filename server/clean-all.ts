import { DatabaseStorage } from "./storage.js";
import { db } from "./db.js";
import { userProgress, userNotes, videos } from "../shared/schema.js";
import { eq, inArray } from "drizzle-orm";

async function cleanAllRelatedData() {
  console.log("🗑️  관련 데이터와 함께 불필요한 영상들을 삭제합니다...");
  
  try {
    const storage = new DatabaseStorage();
    
    // 삭제할 영상 ID 목록 (비행기 기초 ID: 6을 제외한 모든 영상)
    const videosToDelete = [1, 2, 3, 4, 5];
    
    console.log("삭제할 영상 ID 목록:", videosToDelete);
    
    // 1. 먼저 userProgress 삭제
    console.log("\n📊 관련된 사용자 진도 데이터 삭제 중...");
    const deletedProgress = await db.delete(userProgress)
      .where(inArray(userProgress.videoId, videosToDelete));
    console.log("✅ 사용자 진도 데이터 삭제 완료");
    
    // 2. userNotes 삭제
    console.log("\n📝 관련된 사용자 노트 데이터 삭제 중...");
    const deletedNotes = await db.delete(userNotes)
      .where(inArray(userNotes.videoId, videosToDelete));
    console.log("✅ 사용자 노트 데이터 삭제 완료");
    
    // 3. 이제 영상들 삭제
    console.log("\n🎬 영상 삭제 중...");
    for (const videoId of videosToDelete) {
      try {
        const result = await db.delete(videos)
          .where(eq(videos.id, videoId));
        console.log(`✅ ID ${videoId} 영상 삭제 완료`);
      } catch (error) {
        console.log(`❌ ID ${videoId} 영상 삭제 실패:`, error);
      }
    }
    
    // 삭제 후 남은 영상 확인
    const remainingVideos = await storage.getVideos();
    console.log(`\n📊 정리 후 남은 영상: ${remainingVideos.length}개`);
    remainingVideos.forEach(video => {
      console.log(`   - ${video.title} (ID: ${video.id})`);
    });
    
    console.log("\n🎉 모든 데이터 정리가 완료되었습니다!");
    
  } catch (error) {
    console.error("❌ 데이터 정리 중 오류 발생:", error);
  }
}

cleanAllRelatedData().catch(console.error); 