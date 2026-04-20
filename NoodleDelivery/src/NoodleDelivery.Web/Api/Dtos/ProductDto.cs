namespace NoodleDelivery.Web.Api.Dtos;

public class ProductDto
{
    public int ProductId { get; set; }
    public string Name { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}
