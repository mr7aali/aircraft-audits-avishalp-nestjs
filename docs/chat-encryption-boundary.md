# Chat Encryption Boundary

## Current Boundary
- Backend stores `encryptedPayload` for sensitive message content.
- Backend does **not** decrypt end-user content for storage workflows.
- Chat list previews use safe metadata (`messageType` and optional `previewText`) and do not require decryption.

## What Backend Guarantees
- Message type validation and structural payload validation for poll/event/location/contact.
- Participant authorization, receipts, unread counters, and delivery/read events.
- Storage of attachment metadata references only (actual files in storage adapter).

## What Client Must Implement for Full E2EE
- Per-device key generation and secure key exchange protocol.
- Client-side encryption of message plaintext before API submission.
- Client-side decryption after retrieval.
- Key rotation and recovery UX.
- Signature/identity verification and trust model.

## Non-Goals in Current Backend
- Server-side plaintext indexing/search of message content.
- Server-managed decryption or key custody.
- Claims of full cryptographic E2EE without client key management.

