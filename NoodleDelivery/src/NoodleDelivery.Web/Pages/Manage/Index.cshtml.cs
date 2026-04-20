using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace NoodleDelivery.Web.Pages.Manage;

public class ManageIndexModel : PageModel
{
    public IActionResult OnGet()
    {
        return RedirectToPage("/Manage/Drivers");
    }
}
