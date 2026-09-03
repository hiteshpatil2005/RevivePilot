import uuid
import random
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Tuple, Optional
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.customer import Customer
from app.models.merchant import Merchant
from app.schemas.customer import CustomerResponse, CustomerCreate, CustomerUpdate
from app.services.email_service import EmailService
from app.core.logging import logger


class CustomerService:
    @staticmethod
    def _generate_unique_payment_instruments(name: str, cid: uuid.UUID) -> dict:
        """
        Generates unique, realistic payment instruments per registered customer:
        - Unique 16-digit Card Number with Luhn algorithm validity
        - Unique Expiry & CVV
        - Unique UPI VPA handle
        - Unique 14-digit Bank Account & IFSC
        """
        # Derive unique seed from UUID hex
        hex_digits = "".join(filter(str.isdigit, cid.hex))
        if len(hex_digits) < 12:
            hex_digits = (hex_digits + "9876543210123456")[:12]

        # 1. 16-Digit Card Number (Visa BIN 4532)
        mid_8 = hex_digits[:8]
        last_3 = hex_digits[8:11]
        
        # Calculate Luhn check digit for 16-digit card
        partial = f"4532{mid_8}{last_3}"
        digits = [int(d) for d in partial]
        total = 0
        for i, d in enumerate(digits):
            if i % 2 == 0:
                doubled = d * 2
                total += (doubled - 9) if doubled > 9 else doubled
            else:
                total += d
        check_digit = (10 - (total % 10)) % 10
        raw_card = f"{partial}{check_digit}"
        formatted_card = f"{raw_card[0:4]} {raw_card[4:8]} {raw_card[8:12]} {raw_card[12:16]}"

        # 2. Expiry & CVV
        future_year = (datetime.now().year + 3) % 100
        month = max(1, min(12, int(hex_digits[2:4]) % 12 or 10))
        expiry = f"{month:02d}/{future_year}"
        cvv = f"{max(100, int(hex_digits[4:7]) % 900 + 100)}"

        # 3. Unique UPI VPA
        clean_name = "".join(c for c in name.lower() if c.isalnum()) or "user"
        suffix = hex_digits[:4]
        vpa = f"{clean_name}.{suffix}@okhdfcbank"

        # 4. Unique Bank Account (14 digits)
        acct_num = f"501004{hex_digits[:8]}"

        return {
            "card_number": formatted_card,
            "card_network": "Visa",
            "card_expiry": expiry,
            "card_cvv": cvv,
            "upi_vpa": vpa,
            "bank_account_number": acct_num,
            "bank_name": "HDFC Bank",
            "bank_ifsc": "HDFC0001234",
            "balance": Decimal("150000.00"),
        }

    @staticmethod
    def _format_customer(c: Customer) -> CustomerResponse:
        return CustomerResponse(
            id=c.id,
            merchant_id=c.merchant_id,
            merchantId=c.merchant_id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            external_customer_id=c.external_customer_id,
            externalCustomerId=c.external_customer_id,
            is_verified=getattr(c, "is_verified", False),
            isVerified=getattr(c, "is_verified", False),
            card_number=getattr(c, "card_number", None),
            cardNumber=getattr(c, "card_number", None),
            card_network=getattr(c, "card_network", "Visa"),
            cardNetwork=getattr(c, "card_network", "Visa"),
            card_expiry=getattr(c, "card_expiry", "12/28"),
            cardExpiry=getattr(c, "card_expiry", "12/28"),
            card_cvv=getattr(c, "card_cvv", None),
            cardCvv=getattr(c, "card_cvv", None),
            upi_vpa=getattr(c, "upi_vpa", None),
            upiVpa=getattr(c, "upi_vpa", None),
            bank_account_number=getattr(c, "bank_account_number", None),
            bankAccountNumber=getattr(c, "bank_account_number", None),
            bank_name=getattr(c, "bank_name", "HDFC Bank"),
            bankName=getattr(c, "bank_name", "HDFC Bank"),
            bank_ifsc=getattr(c, "bank_ifsc", "HDFC0001234"),
            bankIfsc=getattr(c, "bank_ifsc", "HDFC0001234"),
            balance=getattr(c, "balance", Decimal("150000.00")),
            created_at=c.created_at,
            createdAt=c.created_at,
            updated_at=c.updated_at,
            updatedAt=c.updated_at,
        )

    @staticmethod
    async def list_customers(
        session: AsyncSession,
        merchant_id: uuid.UUID,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
    ) -> Tuple[List[CustomerResponse], int]:
        query = select(Customer).where(Customer.merchant_id == merchant_id)

        if search:
            s_term = f"%{search}%"
            query = query.where(
                or_(
                    Customer.name.ilike(s_term),
                    Customer.email.ilike(s_term),
                    Customer.phone.ilike(s_term),
                    Customer.external_customer_id.ilike(s_term),
                )
            )

        count_query = select(func.count()).select_from(query.subquery())
        total = await session.scalar(count_query) or 0

        query = query.order_by(Customer.created_at.desc())
        offset = (page - 1) * limit
        query = query.offset(offset).limit(limit)

        result = await session.execute(query)
        customers = list(result.scalars().all())

        return [CustomerService._format_customer(c) for c in customers], total

    @staticmethod
    async def get_by_id(
        session: AsyncSession,
        customer_id: uuid.UUID,
        merchant_id: uuid.UUID,
    ) -> CustomerResponse:
        customer = await session.get(Customer, customer_id)
        if not customer or customer.merchant_id != merchant_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found",
            )
        return CustomerService._format_customer(customer)

    @staticmethod
    async def register_portal_customer(
        session: AsyncSession,
        name: str,
        email: str,
        phone: Optional[str] = None,
    ) -> dict:
        """
        Registers real customer for Acme Store, generates OTP verification code,
        assigns unique dynamic payment instruments, and emails code via SMTP.
        """
        norm_email = email.strip().lower()

        # Find default or first active merchant
        merchant = (await session.scalars(select(Merchant).limit(1))).first()
        if not merchant:
            raise HTTPException(status_code=500, detail="No active merchant found in platform")

        # Find existing or create new customer
        customer = (
            await session.scalars(
                select(Customer).where(
                    Customer.merchant_id == merchant.id,
                    Customer.email.ilike(norm_email),
                )
            )
        ).first()

        cid = customer.id if customer else uuid.uuid4()
        otp = f"{random.randint(100000, 999999)}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)

        instruments = CustomerService._generate_unique_payment_instruments(name, cid)

        if customer:
            customer.name = name
            customer.phone = phone or customer.phone
            customer.verification_code = otp
            customer.verification_code_expires_at = expires_at
            # Update instruments if not present
            if not customer.card_number:
                for k, v in instruments.items():
                    setattr(customer, k, v)
        else:
            customer = Customer(
                id=cid,
                merchant_id=merchant.id,
                name=name,
                email=norm_email,
                phone=phone or "+91 98765 43210",
                external_customer_id=f"cust_{norm_email.split('@')[0]}",
                is_verified=False,
                verification_code=otp,
                verification_code_expires_at=expires_at,
                **instruments,
            )
            session.add(customer)

        await session.commit()
        await session.refresh(customer)

        # Dispatch real email via Python SMTP mailer
        email_res = await EmailService.send_verification_email(
            to_email=norm_email,
            name=name,
            code=otp,
        )

        return {
            "success": True,
            "message": f"Verification code dispatched to {norm_email}",
            "email": norm_email,
            "customerId": str(customer.id),
            "expiresInMinutes": 10,
            "delivery": email_res,
        }

    @staticmethod
    async def verify_portal_customer(
        session: AsyncSession,
        email: str,
        code: str,
    ) -> CustomerResponse:
        """
        Verifies customer OTP code and activates account with unique payment credentials.
        """
        norm_email = email.strip().lower()
        customer = (
            await session.scalars(
                select(Customer).where(Customer.email.ilike(norm_email))
            )
        ).first()

        if not customer:
            raise HTTPException(status_code=404, detail="Customer with this email does not exist")

        now = datetime.now(timezone.utc)
        if (
            not customer.verification_code
            or customer.verification_code.strip() != code.strip()
            or (customer.verification_code_expires_at and customer.verification_code_expires_at < now)
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired 6-digit verification code. Please request a new code.",
            )

        customer.is_verified = True
        customer.verification_code = None
        customer.verification_code_expires_at = None

        await session.commit()
        await session.refresh(customer)
        logger.info(f"[CustomerService] Customer {customer.name} ({customer.email}) successfully verified!")

        return CustomerService._format_customer(customer)

    @staticmethod
    async def get_portal_customer(
        session: AsyncSession,
        email: str,
    ) -> CustomerResponse:
        """
        Fetches active customer profile by email.
        """
        norm_email = email.strip().lower()
        customer = (
            await session.scalars(
                select(Customer).where(Customer.email.ilike(norm_email))
            )
        ).first()

        if not customer:
            raise HTTPException(status_code=404, detail="Customer not found")

        return CustomerService._format_customer(customer)
