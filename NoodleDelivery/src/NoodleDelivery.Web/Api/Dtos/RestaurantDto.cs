namespace NoodleDelivery.Web.Api.Dtos;

public class RestaurantDto
{
    public int RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    public decimal PricePerKg { get; set; }
}

public class CreateRestaurantDto
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public decimal PricePerKg { get; set; } = 0;
}

public class UpdateRestaurantDto
{
    public string Name { get; set; } = string.Empty;
    public string? Address { get; set; }
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
    public decimal PricePerKg { get; set; }
}
