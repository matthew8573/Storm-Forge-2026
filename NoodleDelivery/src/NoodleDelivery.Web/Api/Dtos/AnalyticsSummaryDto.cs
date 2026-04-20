namespace NoodleDelivery.Web.Api.Dtos;

public class AnalyticsSummaryDto
{
    public Dictionary<string, decimal> TotalKgByProduct { get; set; } = new();
    public decimal TotalRevenue { get; set; }
    public TopEntityDto? TopRestaurant { get; set; }
    public TopEntityDto? TopDriver { get; set; }
}

public class TopEntityDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
}

public class OverTimeDto
{
    public string Date { get; set; } = string.Empty;
    public Dictionary<string, decimal> KgByProduct { get; set; } = new();
    public decimal Revenue { get; set; }
}

public class EntityAnalyticsDto
{
    public string EntityType { get; set; } = string.Empty;
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, decimal> TotalKgByProduct { get; set; } = new();
    public decimal TotalRevenue { get; set; }
    public List<OverTimeDto> DailyBreakdown { get; set; } = new();
}

public class RestaurantContributionDto
{
    public int RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public decimal Revenue { get; set; }
    public decimal SharePercent { get; set; }
}

public class TopRestaurantAnalyticsDto
{
    public int RestaurantId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, decimal> KgByProduct { get; set; } = new();
    public decimal Revenue { get; set; }
}

public class TopDriverAnalyticsDto
{
    public int DriverId { get; set; }
    public string Name { get; set; } = string.Empty;
    public Dictionary<string, decimal> KgByProduct { get; set; } = new();
    public decimal Revenue { get; set; }
}
