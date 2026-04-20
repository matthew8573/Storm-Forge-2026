namespace NoodleDelivery.Application.Common.Interfaces;

public interface IAccountingExport
{
    Task ExportOrdersAsync(IEnumerable<int> orderIds, CancellationToken cancellationToken = default);
}
