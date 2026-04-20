namespace NoodleDelivery.Web.Api.Dtos;

public class ProductPriceDto
{
    public int PriceId { get; set; }
    public int ProductId { get; set; }
    public decimal UnitPrice { get; set; }
    public DateOnly EffectiveFrom { get; set; }
}

public class CreateProductPriceDto
{
    public decimal UnitPrice { get; set; }
    public DateOnly EffectiveFrom { get; set; }
}

public class UpdateProductPriceDto
{
    public decimal UnitPrice { get; set; }
    public DateOnly EffectiveFrom { get; set; }
}
