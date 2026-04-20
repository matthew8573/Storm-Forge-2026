namespace NoodleDelivery.Web.Api.Dtos;

public class DriverDto
{
    public int DriverId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
}

public class CreateDriverDto
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
}

public class UpdateDriverDto
{
    public string Name { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public bool IsActive { get; set; }
}
