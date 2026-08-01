# Pinterest integration

Pinterest uses read-only OAuth scopes for user accounts, boards, and Pins. Stable user, board, and Pin IDs anchor identity while usernames and board names may change. Creators explicitly select public boards; secret/private boards and insufficiently-authorized group content are excluded. Pin detections use authoritative timestamps and canonical Pinterest links, deduplicate in the shared pipeline, and create approval-first drafts. Write scopes and publishing are disabled.
