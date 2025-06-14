import { DatabaseStorage } from "./storage.js";

async function deleteSpecificVideos() {
  console.log("🗑️  불필요한 영상들을 삭제합니다...");
  
  try {
    const storage = new DatabaseStorage();
    
    // 삭제할 영상 ID 목록 (비행기 기초 ID: 6을 제외한 모든 영상)
    const videosToDelete = [1, 2, 3, 4, 5];
    
    console.log("삭제할 영상 ID 목록:", videosToDelete);
    
    for (const videoId of videosToDelete) {
      try {
        const success = await storage.deleteVideo(videoId);
        if (success) {
          console.log(`✅ ID ${videoId} 영상 삭제 완료`);
        } else {
          console.log(`⚠️  ID ${videoId} 영상을 찾을 수 없습니다`);
        }
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
    
    console.log("\n🎉 영상 정리가 완료되었습니다!");
    
  } catch (error) {
    console.error("❌ 영상 삭제 중 오류 발생:", error);
  }
}

deleteSpecificVideos().catch(console.error); 