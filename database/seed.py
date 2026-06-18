import sys
import os
from datetime import datetime, timezone
from uuid import uuid4, UUID

# Add the parent directory to the path so we can import from database
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from database.models import Base, engine, SessionLocal, get_db
from database.models import User, Session as ChatSession, Message, UploadedFile, DocumentChunk

def seed_database():
    """Seed the database with sample data"""
    db = SessionLocal()
    
    try:
        print("Starting database seeding...")
        
        # Clear existing data (in reverse order of dependencies)
        print("Clearing existing data...")
        db.query(DocumentChunk).delete()
        db.query(UploadedFile).delete()
        db.query(Message).delete()
        db.query(ChatSession).delete()
        db.query(User).delete()
        db.commit()
        
        # Create sample users
        print("Creating sample users...")
        user1 = User(
            id=UUID('11111111-1111-1111-1111-111111111111'),
            username="alice",
            created_at=datetime.now(timezone.utc)
        )
        user2 = User(
            id=UUID('22222222-2222-2222-2222-222222222222'),
            username="bob",
            created_at=datetime.now(timezone.utc)
        )
        db.add_all([user1, user2])
        db.commit()
        
        # Create sample sessions
        print("Creating sample sessions...")
        session1 = ChatSession(
            id=UUID('33333333-3333-3333-3333-333333333333'),
            user_id=user1.id,
            name="Sales Analysis",
            created_at=datetime.now(timezone.utc)
        )
        session2 = ChatSession(
            id=UUID('44444444-4444-4444-4444-444444444444'),
            user_id=user1.id,
            name="Q4 Report",
            created_at=datetime.now(timezone.utc)
        )
        session3 = ChatSession(
            id=UUID('55555555-5555-5555-5555-555555555555'),
            user_id=user2.id,
            name="Customer Feedback",
            created_at=datetime.now(timezone.utc)
        )
        db.add_all([session1, session2, session3])
        db.commit()
        
        # Create sample messages
        print("Creating sample messages...")
        message1 = Message(
            id=UUID('66666666-6666-6666-6666-666666666666'),
            session_id=session1.id,
            role="user",
            content="What were the total sales in Q3?",
            source_citations=None,
            created_at=datetime.now(timezone.utc)
        )
        message2 = Message(
            id=UUID('77777777-7777-7777-7777-777777777777'),
            session_id=session1.id,
            role="assistant",
            content="The total sales in Q3 were $1.2 million, with the highest performing region being North America.",
            source_citations=[
                {"filename": "sales_q3.xlsx", "row_start": 50, "row_end": 75},
                {"filename": "sales_q3.xlsx", "row_start": 100, "row_end": 120}
            ],
            created_at=datetime.now(timezone.utc)
        )
        message3 = Message(
            id=UUID('88888888-8888-8888-8888-888888888888'),
            session_id=session3.id,
            role="user",
            content="Which product received the most complaints?",
            source_citations=None,
            created_at=datetime.now(timezone.utc)
        )
        db.add_all([message1, message2, message3])
        db.commit()
        
        # Create sample uploaded files
        print("Creating sample uploaded files...")
        file1 = UploadedFile(
            id=UUID('99999999-9999-9999-9999-999999999999'),
            session_id=session1.id,
            filename="sales_data.xlsx",
            file_size=1048576,
            uploaded_at=datetime.now(timezone.utc)
        )
        file2 = UploadedFile(
            id=UUID('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
            session_id=session3.id,
            filename="customer_feedback.xlsx",
            file_size=524288,
            uploaded_at=datetime.now(timezone.utc)
        )
        db.add_all([file1, file2])
        db.commit()
        
        # Create sample document chunks
        print("Creating sample document chunks...")
        chunk1 = DocumentChunk(
            id=UUID('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'),
            uploaded_file_id=file1.id,
            chunk_index=0,
            content="Sales data for Q3 shows strong performance in North America with $450,000 in revenue. The top products were Product A ($120,000) and Product B ($95,000).",
            row_start=1,
            row_end=25,
            embedding=None,
            created_at=datetime.now(timezone.utc)
        )
        chunk2 = DocumentChunk(
            id=UUID('cccccccc-cccc-cccc-cccc-cccccccccccc'),
            uploaded_file_id=file1.id,
            chunk_index=1,
            content="European sales totaled $320,000 with Germany leading at $150,000. Product C showed unexpected growth of 25% quarter-over-quarter.",
            row_start=26,
            row_end=50,
            embedding=None,
            created_at=datetime.now(timezone.utc)
        )
        chunk3 = DocumentChunk(
            id=UUID('dddddddd-dddd-dddd-dddd-dddddddddddd'),
            uploaded_file_id=file2.id,
            chunk_index=0,
            content="Customer feedback analysis reveals Product D received 45 complaints about durability, while Product E had only 3 complaints about delivery times.",
            row_start=1,
            row_end=30,
            embedding=None,
            created_at=datetime.now(timezone.utc)
        )
        db.add_all([chunk1, chunk2, chunk3])
        db.commit()
        
        print("Database seeding completed successfully!")
        
    except IntegrityError as e:
        db.rollback()
        print(f"Integrity error during seeding: {e}")
        raise
    except SQLAlchemyError as e:
        db.rollback()
        print(f"Database error during seeding: {e}")
        raise
    except Exception as e:
        db.rollback()
        print(f"Unexpected error during seeding: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()