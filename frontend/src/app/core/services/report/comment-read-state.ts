import { Injectable } from '@angular/core';

export interface CommentReadMarker {
  comment_id: number;
  quarter_id: number;
  commented_by: number;
}

@Injectable({ providedIn: 'root' })
export class CommentReadStateService {
  getUnreadCount(
    comments: readonly CommentReadMarker[],
    userId: number,
    churchId: number,
    departmentId: number
  ): number {
    if (!userId) return 0;

    return comments.filter(comment =>
      Number(comment.commented_by) !== userId &&
      comment.comment_id > this.getLastReadId(
        userId,
        churchId,
        departmentId,
        comment.quarter_id
      )
    ).length;
  }

  markAsRead(
    comments: readonly CommentReadMarker[],
    userId: number,
    churchId: number,
    departmentId: number
  ): void {
    if (!userId) return;

    const latestByQuarter = new Map<number, number>();

    for (const comment of comments) {
      latestByQuarter.set(
        comment.quarter_id,
        Math.max(latestByQuarter.get(comment.quarter_id) ?? 0, comment.comment_id)
      );
    }

    try {
      for (const [quarterId, commentId] of latestByQuarter) {
        localStorage.setItem(
          this.storageKey(userId, churchId, departmentId, quarterId),
          String(commentId)
        );
      }
    } catch {
      // Keep the conversation usable if browser storage is unavailable.
    }
  }

  private getLastReadId(
    userId: number,
    churchId: number,
    departmentId: number,
    quarterId: number
  ): number {
    try {
      return Number(localStorage.getItem(
        this.storageKey(userId, churchId, departmentId, quarterId)
      )) || 0;
    } catch {
      return 0;
    }
  }

  private storageKey(
    userId: number,
    churchId: number,
    departmentId: number,
    quarterId: number
  ): string {
    return `ics:comments:last-read:${userId}:${churchId}:${departmentId}:${quarterId}`;
  }
}