import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...crud import product as crud
from ...models.user import User
from ...schemas.product import ProductCreate, ProductRead, ProductUpdate
from ..deps import get_current_user, require_roles

router = APIRouter(prefix="/products", tags=["products"])

# Upload config
UPLOAD_DIR = Path(os.environ.get("UPLOAD_DIR", "uploads")) / "products"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_SIZE_MB = 5


@router.get("", response_model=list[ProductRead])
def list_products(
    include_inactive: bool = True,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ProductRead]:
    return [ProductRead.model_validate(p) for p in crud.list_all(db, include_inactive=include_inactive)]


@router.post("", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    if crud.get_by_sku(db, payload.sku):
        raise HTTPException(status_code=409, detail=f"SKU déjà utilisé : {payload.sku}")
    try:
        product = crud.create(db, payload)
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Création impossible : {e.orig}")
    return ProductRead.model_validate(product)


@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    return ProductRead.model_validate(product)


@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    if payload.sku and payload.sku != product.sku and crud.get_by_sku(db, payload.sku):
        raise HTTPException(status_code=409, detail=f"SKU déjà utilisé : {payload.sku}")
    return ProductRead.model_validate(crud.update(db, product, payload))


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    _: User = Depends(require_roles("OWNER")),
    db: Session = Depends(get_db),
) -> None:
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")
    try:
        crud.delete(db, product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="Produit lié à des lots — désactive-le plutôt que de le supprimer",
        )


@router.post("/{product_id}/upload-image", response_model=ProductRead)
async def upload_product_image(
    product_id: int,
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    """Upload une image produit. Accepte jpeg/png/webp/gif, max 5 MB.
    Le fichier est stocké dans uploads/products/{uuid}.{ext} et son URL
    relative est sauvée dans product.image_url."""
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Type de fichier non supporté. Autorisés : JPEG, PNG, WebP, GIF.",
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Image trop volumineuse (max {MAX_IMAGE_SIZE_MB} MB).",
        )

    # Determine extension from content_type
    ext_map = {
        "image/jpeg": "jpg", "image/png": "png",
        "image/webp": "webp", "image/gif": "gif",
    }
    ext = ext_map[file.content_type]
    filename = f"{product_id}-{uuid.uuid4().hex[:8]}.{ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(contents)

    # URL relative servie par StaticFiles
    image_url = f"/uploads/products/{filename}"

    # Met à jour le produit
    updated = crud.update(db, product, ProductUpdate(image_url=image_url))
    return ProductRead.model_validate(updated)


@router.post("/{product_id}/upload-barcode", response_model=ProductRead)
async def upload_product_barcode(
    product_id: int,
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ProductRead:
    """Upload une image de code-barres GS1. Mêmes contraintes que l'image
    produit (jpeg/png/webp/gif, max 5 MB). Stockée dans uploads/products/,
    son URL est sauvée dans product.barcode_image_url."""
    product = crud.get_by_id(db, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Produit introuvable")

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Type de fichier non supporté. Autorisés : JPEG, PNG, WebP, GIF.",
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_SIZE_MB * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail=f"Image trop volumineuse (max {MAX_IMAGE_SIZE_MB} MB).",
        )

    ext_map = {
        "image/jpeg": "jpg", "image/png": "png",
        "image/webp": "webp", "image/gif": "gif",
    }
    ext = ext_map[file.content_type]
    filename = f"barcode-{product_id}-{uuid.uuid4().hex[:8]}.{ext}"
    dest = UPLOAD_DIR / filename
    dest.write_bytes(contents)

    barcode_url = f"/uploads/products/{filename}"
    updated = crud.update(db, product, ProductUpdate(barcode_image_url=barcode_url))
    return ProductRead.model_validate(updated)
