import { TestBed } from '@angular/core/testing';
import { CommentReadMarker, CommentReadStateService } from './comment-read-state';

describe('CommentReadStateService', () => {
  let service: CommentReadStateService;
  const userId = Date.now();
  const churchId = 91;
  const departmentId = 92;

  beforeEach(() => {
    service = TestBed.inject(CommentReadStateService);
  });

  it('counts unread incoming comments by quarter and marks visible comments as read', () => {
    const comments: CommentReadMarker[] = [
      { comment_id: 101, quarter_id: 1, commented_by: 2 },
      { comment_id: 102, quarter_id: 1, commented_by: userId },
      { comment_id: 103, quarter_id: 2, commented_by: 3 }
    ];

    expect(service.getUnreadCount(comments, userId, churchId, departmentId)).toBe(2);

    service.markAsRead(comments.slice(0, 2), userId, churchId, departmentId);

    expect(service.getUnreadCount(comments, userId, churchId, departmentId)).toBe(1);
  });
});