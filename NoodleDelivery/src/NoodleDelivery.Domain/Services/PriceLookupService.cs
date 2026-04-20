using NoodleDelivery.Domain.Entities;

namespace NoodleDelivery.Domain.Services;

public static class PriceLookupService
{
    public static ProductPrice? GetEffectivePrice(IEnumerable<ProductPrice> prices, int productId, DateOnly date)
        => prices
            .Where(p => p.ProductId == productId && p.EffectiveFrom <= date)
            .OrderByDescending(p => p.EffectiveFrom)
            .FirstOrDefault();
}
