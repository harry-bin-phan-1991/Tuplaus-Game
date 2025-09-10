-- CreateTable
CREATE TABLE "public"."GameRound" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "bet" DOUBLE PRECISION NOT NULL,
    "choice" TEXT NOT NULL,
    "drawnCard" INTEGER NOT NULL,
    "didWin" BOOLEAN NOT NULL,
    "winnings" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameRound_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."GameRound" ADD CONSTRAINT "GameRound_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "public"."Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
